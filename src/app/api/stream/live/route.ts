import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { automationBroadcaster } from '@/lib/automation-broadcaster';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Data fetchers per domain ────────────────────────────────────────────────

async function fetchDoctors() {
    const doctors = await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
    return doctors.map(d => ({
        ...d,
        lastManualOverride: d.lastManualOverride ? d.lastManualOverride.toString() : null,
    }));
}

async function fetchShifts() {
    return prisma.shift.findMany();
}

async function fetchLeaves() {
    return prisma.leaveRequest.findMany();
}

async function fetchSettings() {
    const s = await prisma.settings.findFirst();
    return s || { automationEnabled: false };
}

// Helper: format a named SSE event
// `event: <name>\ndata: <json>\n\n`
function formatEvent(name: string, data: unknown): string {
    const json = JSON.stringify(data, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
    );
    return `event: ${name}\ndata: ${json}\n\n`;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
    const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx buffering for SSE
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let closed = false;

            const send = (chunk: string) => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(chunk));
                } catch {
                    closed = true;
                }
            };

            console.log(`[SSE] New connection established. UA: ${req.headers.get('user-agent')}`);

            // ── 1. Initial snapshot: send all domains as named events ──
            try {
                const [doctors, shifts, leaves, settings] = await Promise.all([
                    fetchDoctors(),
                    fetchShifts(),
                    fetchLeaves(),
                    fetchSettings(),
                ]);
                console.log(`[SSE] Sending initial snapshot: ${doctors.length} doctors`);
                send(formatEvent('doctors', doctors));
                send(formatEvent('shifts', shifts));
                send(formatEvent('leaves', leaves));
                send(formatEvent('settings', settings));
                
                // ── 1.1 Legacy snapshot for tv.html (unnamed event) ──
                const snapshot = { doctors, shifts, leaves, settings };
                send(`data: ${JSON.stringify(snapshot, (_, v) => typeof v === 'bigint' ? v.toString() : v)}\n\n`);
            } catch (err) {
                console.error('[SSE] initial fetch error:', err);
            }

            // ── 2. Doctor update listener (triggered by automation/manual updates) ──
            const onDoctorUpdate = async () => {
                console.log('[SSE] Broadcasting doctor update');
                try {
                    const doctors = await fetchDoctors();
                    send(formatEvent('doctors', doctors));
                } catch (err) {
                    console.error('[SSE] doctor update error:', err);
                }
            };

            // ── 3. Settings update listener ──
            const onSettingsUpdate = async () => {
                console.log('[SSE] Broadcasting settings update');
                try {
                    const settings = await fetchSettings();
                    send(formatEvent('settings', settings));
                } catch (err) {
                    console.error('[SSE] settings update error:', err);
                }
            };

            // ── 4. Shift update listener ──
            const onShiftUpdate = async () => {
                try {
                    const shifts = await fetchShifts();
                    send(formatEvent('shifts', shifts));
                } catch (err) {
                    console.error('[SSE] shift update error:', err);
                }
            };

            automationBroadcaster.on('doctors', onDoctorUpdate);
            automationBroadcaster.on('settings', onSettingsUpdate);
            automationBroadcaster.on('shifts', onShiftUpdate);

            // ── 5. Heartbeat every 25s (keeps connection through proxies) ──
            const hb = setInterval(() => {
                send(': heartbeat\n\n');
            }, 2_000);

            // ── 6. Cleanup on client disconnect ──
            req.signal.addEventListener('abort', () => {
                closed = true;
                automationBroadcaster.off('doctors', onDoctorUpdate);
                automationBroadcaster.off('settings', onSettingsUpdate);
                automationBroadcaster.off('shifts', onShiftUpdate);
                clearInterval(hb);
                try { controller.close(); } catch { /* already closed */ }
            });
        },
    });

    return new Response(stream, { headers });
}
