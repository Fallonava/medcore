import { NextResponse } from 'next/server';
import { automationBroadcaster } from '@/lib/automation-broadcaster';

// This route sets up an SSE connection and emits server events when doctors update.
// Long-lived SSE connections require the Node.js runtime (not the Edge runtime).
// Use the `nodejs` runtime variant supported by Next.js for route handlers.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
    });

    const stream = new ReadableStream({
        start(controller) {
            let isClosed = false;
            const encoder = new TextEncoder();

            const send = (data: any) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch (e) {
                    cleanup();
                }
            };

            const listener = (updates: any) => {
                send({ type: 'doctors', updates });
            };

            const cleanup = () => {
                if (isClosed) return;
                isClosed = true;
                clearInterval(iv);
                automationBroadcaster.off('doctors', listener);
                try {
                    controller.close();
                } catch (e) {
                    // Ignore errors if already closing/closed
                }
            };

            // keep-alive ping
            const iv = setInterval(() => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(': ping\n\n'));
                } catch (e) {
                    cleanup();
                }
            }, 25000);

            automationBroadcaster.on('doctors', listener);
            
            // Link abort signal if request provides one
            if (request.signal) {
                request.signal.addEventListener('abort', cleanup);
            }
        },
        cancel() {
            // Standard cleanup on stream cancellation
        }
    });

    return new NextResponse(stream, { headers });
}
