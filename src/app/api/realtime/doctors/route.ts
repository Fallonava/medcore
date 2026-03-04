import { NextResponse } from 'next/server';
import { automationBroadcaster } from '@/lib/automation-broadcaster';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const onUpdate = (updates: any) => {
                const data = JSON.stringify({ updates, timestamp: Date.now() });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            // Initial heartbeat
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));

            // Listen to broadcaster
            automationBroadcaster.on('doctors', onUpdate);

            // Keep track of the interval to keep the connection alive
            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            }, 30000);

            // Clean up on close
            req.signal.addEventListener('abort', () => {
                automationBroadcaster.off('doctors', onUpdate);
                clearInterval(heartbeat);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
