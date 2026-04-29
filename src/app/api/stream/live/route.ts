export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';

// Helper: format a named SSE event
function formatEvent(name: string, data: unknown): string {
    const json = JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
    );
    return `event: ${name}\ndata: ${json}\n\n`;
}

async function fetchDoctors() {
    const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
    return doctors.map(d => ({
        ...d,
        lastManualOverride: d.lastManualOverride ? d.lastManualOverride.toString() : null,
    }));
}

async function fetchShifts() {
    return (prisma as any).shift.findMany();
}

async function fetchLeaves() {
    return (prisma as any).leaveRequest.findMany();
}

async function fetchSettings() {
    const s = await prisma.settings.findFirst();
    return s || { automationEnabled: false };
}

/**
 * /api/stream/live — SSE endpoint for TV Display.
 *
 * Edge-compatible: sends an initial snapshot then closes.
 * TV Display should reconnect every 30s for a fresh snapshot.
 * Real-time doctor updates are pushed via Pusher (not SSE).
 */
export async function GET(req: Request) {
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const send = (chunk: string) => {
                try { controller.enqueue(encoder.encode(chunk)); } catch {}
            };

            try {
                const [doctors, shifts, leaves, settings] = await Promise.all([
                    fetchDoctors(),
                    fetchShifts(),
                    fetchLeaves(),
                    fetchSettings(),
                ]);

                send(formatEvent('doctors', doctors));
                send(formatEvent('shifts', shifts));
                send(formatEvent('leaves', leaves));
                send(formatEvent('settings', settings));

                // Legacy snapshot for tv.html (unnamed event)
                const snapshot = { doctors, shifts, leaves, settings };
                send(`data: ${JSON.stringify(snapshot, (_, v) => typeof v === 'bigint' ? v.toString() : v)}\n\n`);
            } catch (err) {
                console.error('[SSE] initial fetch error:', err);
            } finally {
                // In Edge: close after initial snapshot.
                // TV display should poll/reconnect for updates.
                try { controller.close(); } catch {}
            }
        },
    });

    return new Response(stream, { headers });
}
