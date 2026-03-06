import { NextResponse } from 'next/server';
import { automationBroadcaster } from '@/lib/automation-broadcaster';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let closed = false;

            const onUpdate = (updates: any) => {
                if (closed) return;
                try {
                    const data = JSON.stringify({ updates, timestamp: Date.now() });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (e) {
                    console.error('[SSE] Update enqueue failed:', e);
                    cleanup();
                }
            };

            const cleanup = () => {
                if (closed) return;
                closed = true;
                automationBroadcaster.off('doctors', onUpdate);
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch (e) {
                    // Ignore errors if controller is already closing/closed
                }
            };

            // Initial heartbeat
            try {
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            } catch (e) {
                closed = true;
                return;
            }

            // Listen to broadcaster
            automationBroadcaster.on('doctors', onUpdate);

            // Keep track of the interval to keep the connection alive
            const heartbeat = setInterval(() => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch (e) {
                    cleanup();
                }
            }, 30000);

            // Clean up on close
            req.signal.addEventListener('abort', cleanup);
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
