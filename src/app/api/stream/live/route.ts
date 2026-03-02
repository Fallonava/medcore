import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EventEmitter } from 'events';

export const runtime = 'nodejs';

// Global cache and emitter for all connected SSE clients
const streamEmitter = new EventEmitter();
streamEmitter.setMaxListeners(0); // Allow unlimited clients

let isPolling = false;
let lastDataStr = '';

// Central polling loop: Queries DB once every 5s and fans out to all clients
async function startPolling() {
    if (isPolling) return;
    isPolling = true;
    
    // Initial fetch
    await fetchAndBroadcast();

    setInterval(async () => {
        await fetchAndBroadcast();
    }, 5000); // Poll every 5 seconds
}

async function fetchAndBroadcast() {
    try {
        const [doctors, shifts, leaves, settings] = await Promise.all([
            prisma.doctor.findMany({ orderBy: { name: 'asc' } }),
            prisma.shift.findMany(),
            prisma.leaveRequest.findMany(),
            prisma.settings.findFirst()
        ]);
        
        const data = { 
            doctors, 
            shifts, 
            leaves, 
            settings: settings || { automationEnabled: false } 
        };
        const dataStr = JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v);        
        // Only broadcast if data actually changed to save bandwidth
        if (dataStr !== lastDataStr) {
            lastDataStr = dataStr;
            streamEmitter.emit('update', dataStr);
        }
    } catch (error) {
        console.error('SSE central polling error:', error);
    }
}

export async function GET(req: Request) {
    startPolling();

    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
    });

    const stream = new ReadableStream({
        async start(controller) {
            const send = (dataStr: string) => {
                try {
                    controller.enqueue(`data: ${dataStr}\n\n`);
                } catch (e) {
                    // Stream closed
                }
            };

            // 1. Send immediate initial state to the new client
            if (lastDataStr) {
                 send(lastDataStr);
            }

            // 2. Subscribe to future broadcast updates
            const listener = (dataStr: string) => send(dataStr);
            streamEmitter.on('update', listener);

            // 3. Keep-alive ping to prevent connection timeout (essential for AWS/Nginx)
            let isClosed = false;
            const iv = setInterval(() => {
                if (!isClosed) {
                    try {
                        controller.enqueue(': ping\n\n');
                    } catch (e) {
                        isClosed = true;
                        clearInterval(iv);
                    }
                }
            }, 25000);

            // 4. Cleanup on disconnect
            (controller as any).oncancel = () => {
                isClosed = true;
                clearInterval(iv);
                streamEmitter.off('update', listener);
            };
        }
    });

    return new NextResponse(stream, { headers });
}
