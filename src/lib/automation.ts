import type { Doctor, Shift, LeaveRequest, Settings } from "@/lib/data-service";
import { prisma } from "@/lib/prisma";
import { notifyDoctorUpdates } from "./automation-broadcaster";
import { revalidatePath } from "next/cache";

// utility functions (copy from hook)
function parseTimeToMinutes(timeStr: string | undefined): number | null {
    if (!timeStr) return null;
    const t = timeStr.trim().toLowerCase();
    const ampm = t.match(/(am|pm)$/);
    let cleaned = t.replace(/\s*(am|pm)$/, '');
    cleaned = cleaned.replace('.', ':');
    const parts = cleaned.split(':');
    if (parts.length < 2) return null;
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m)) return null;
    if (ampm) {
        const ap = ampm[1];
        if (ap === 'pm' && h < 12) h += 12;
        if (ap === 'am' && h === 12) h = 0;
    }
    return h * 60 + m;
}

function formatDateYMD(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isDateInLeavePeriod(todayStr: string, startDate: Date | string | null, endDate: Date | string | null): boolean {
    if (!startDate || !endDate) return false;

    // Normalize todayStr (YYYY-MM-DD) into components
    const todayMatch = todayStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!todayMatch) return false;

    // To avoid timezone shift issues, parse strictly to midnight local time for comparison
    const target = new Date(Number(todayMatch[1]), Number(todayMatch[2]) - 1, Number(todayMatch[3]));
    target.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);

    // We only care about YMD boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
}

function matchDoctorName(leaveName: string, doctorName: string): boolean {
    const normalize = (s: string) => s.toLowerCase()
        .replace(/^dr\.?\s*/i, '')
        .replace(/,?\s*sp\.?\s*\w+/gi, '')
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    const a = normalize(leaveName);
    const b = normalize(doctorName);
    if (a === b) return true;
    return a.includes(b) || b.includes(a);
}
// Evaluate a set of automation rules against provided data. Returns status updates that
// would be applied without mutating anything. This lets us simulate/test rules.
export function evaluateRules(
    rules: any[],
    doctors: Doctor[],
    shifts: Shift[],
    leaves: LeaveRequest[],
    now?: Date
): Array<{ id: string | number; status: Doctor['status'] }> {
    const updates: Array<{ id: string | number; status: Doctor['status'] }> = [];
    const ts = now || new Date();
    // Shift the date to WIB (UTC+7) so that our UTC methods get the actual Jakarta time
    const wibTime = new Date(ts.getTime() + (7 * 60 * 60 * 1000));

    const currentDayIdx = wibTime.getUTCDay() === 0 ? 6 : wibTime.getUTCDay() - 1;
    const currentHour = wibTime.getUTCHours();
    const currentMinute = wibTime.getUTCMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const todayStr = `${wibTime.getUTCFullYear()}-${String(wibTime.getUTCMonth() + 1).padStart(2, '0')}-${String(wibTime.getUTCDate()).padStart(2, '0')}`;

    for (const rule of rules) {
        try {
            const cond: any = rule.condition || {};
            const act: any = rule.action || {};
            for (const doc of doctors) {
                let match = true;
                if (cond.doctorName) {
                    if (!matchDoctorName(cond.doctorName, doc.name)) match = false;
                }
                if (cond.status && cond.status !== doc.status) match = false;
                if (cond.dateRange) {
                    // Deprecated: dateRange as condition checking removed in automated leave implementation
                    // if (!isDateInRange(todayStr, cond.dateRange)) match = false;
                }
                if (cond.timeRange) {
                    const parts = String(cond.timeRange).split('-');
                    if (parts.length === 2) {
                        const s = parseTimeToMinutes(parts[0]);
                        const e = parseTimeToMinutes(parts[1]);
                        if (s === null || e === null) match = false;
                        else if (!(currentTimeMinutes >= s && currentTimeMinutes < e)) match = false;
                    }
                }
                if (!match) continue;
                if (act.status && doc.status !== act.status) {
                    if (!updates.some(u => String(u.id) === String(doc.id))) {
                        updates.push({ id: doc.id, status: act.status });
                    }
                }
            }
        } catch (e) {
            console.warn('rule evaluate error', (rule && (rule as any).id) || '<unknown>', e);
        }
    }
    return updates;
}
export async function runAutomation(): Promise<{ applied: number, failed: number }> {
    const runStartTime = Date.now();
    let applied = 0, failed = 0;
    let error: string | null = null;

    try {
        // fetch data
        const rawDoctors = await prisma.doctor.findMany();
        // normalize BigInt fields and types coming from Prisma
        const doctors = rawDoctors.map(d => ({
            ...d,
            id: String(d.id),
            lastManualOverride: d.lastManualOverride !== null ? Number(d.lastManualOverride) : undefined
        })) as unknown as Doctor[];

        const rawShifts = await (prisma.shift as any).findMany();
        const shifts = rawShifts.map((s: any) => {
            const docRef = rawDoctors.find(d => d.id === s.doctorId);
            return { ...s, id: Number(s.id), doctor: docRef?.name || '' };
        }) as unknown as Shift[];

        const rawLeaves = await (prisma.leaveRequest as any).findMany();
        const leaves = rawLeaves.map((l: any) => {
            const docRef = rawDoctors.find(d => d.id === l.doctorId);
            return { ...l, id: String(l.id), doctor: docRef?.name || '' };
        }) as unknown as LeaveRequest[];

        const settingsRow = await prisma.settings.findFirst();
        const settings: Settings | null = settingsRow ? {
            ...settingsRow,
            id: String(settingsRow.id),
            runTextMessage: settingsRow.runTextMessage ?? undefined,
            emergencyMode: settingsRow.emergencyMode ?? undefined,
            customMessages: (settingsRow as any).customMessages ?? undefined,
        } : null;

        // prepare updates collector early so rules can push into it
        // collector for status updates (populated by rules and evaluation)
        const updates: Array<{ id: string | number; status: Doctor['status'] }> = [];

        // compute current time/day context for rule evaluation
        const now = new Date();
        const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

        const currentDayIdx = wibTime.getUTCDay() === 0 ? 6 : wibTime.getUTCDay() - 1;
        const currentHour = wibTime.getUTCHours();
        const currentMinute = wibTime.getUTCMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        const todayStr = `${wibTime.getUTCFullYear()}-${String(wibTime.getUTCMonth() + 1).padStart(2, '0')}-${String(wibTime.getUTCDate()).padStart(2, '0')}`;

        // load active rules if model exists in Prisma schema (optional)
        const rules: any[] = (prisma as any).automationRule ? await (prisma as any).automationRule.findMany({ where: { active: true } }) : [];
        if (rules.length > 0) {
            console.debug('[automation] loaded', rules.length, 'active rules');
        }
        updates.push(...evaluateRules(rules, doctors, shifts, leaves, now));

        const automationEnabled = settings?.automationEnabled || false;
        if (!automationEnabled || doctors.length === 0 || shifts.length === 0) {
            return { applied: 0, failed: 0 };
        }

        // (time context already computed above)

        // Override cooldown: 4 hours
        const OVERRIDE_COOLDOWN_MS = 4 * 60 * 60 * 1000;

        for (const doc of doctors) {
            // Check if there is an active manual override cooldown
            const isCooldownActive = doc.lastManualOverride
                ? (now.getTime() - doc.lastManualOverride) < OVERRIDE_COOLDOWN_MS
                : false;

            const isOnLeaveToday = leaves.some(leave =>
                leave.doctorId === doc.id &&
                isDateInLeavePeriod(todayStr, leave.startDate, leave.endDate)
            );
            if (isOnLeaveToday) {
                if (doc.status !== 'CUTI') updates.push({ id: doc.id, status: 'CUTI' });
                continue;
            }
            if (doc.status === 'CUTI' && !isOnLeaveToday) {
                updates.push({ id: doc.id, status: 'TIDAK_PRAKTEK' });
                continue;
            }
            const todayShifts = shifts.filter(s =>
                s.doctorId === doc.id && s.dayIdx === currentDayIdx && s.formattedTime &&
                !(s.disabledDates || []).includes(todayStr)
            );

            // Sweep immediately if no shifts today
            if (todayShifts.length === 0) {
                if (doc.status === 'BUKA' || doc.status === 'SELESAI' || doc.status === 'PENUH' || doc.status === 'AKAN_BUKA') {
                    console.log(`[automation DEBUG] ${doc.name} (id ${doc.id}) has NO SHIFT TODAY. Setting to TIDAK_PRAKTEK from ${doc.status}`);
                    updates.push({ id: doc.id, status: 'TIDAK_PRAKTEK' });
                }
                continue;
            }

            let isWithinAnyShift = false;
            let isAfterAllShifts = true;
            let latestEndMinutes = 0;
            let activeShiftStatusOverride: Doctor['status'] | null = null;
            for (const shift of todayShifts) {
                const [startStr, endStr] = shift.formattedTime!.split('-');
                const startMinutes = parseTimeToMinutes(startStr);
                const endMinutes = parseTimeToMinutes(endStr);
                if (startMinutes === null || endMinutes === null) continue;

                if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
                    isWithinAnyShift = true;
                    if (shift.statusOverride) {
                        activeShiftStatusOverride = shift.statusOverride as Doctor['status'];
                    }
                }

                if (currentTimeMinutes < endMinutes) {
                    isAfterAllShifts = false;
                }
                if (endMinutes > latestEndMinutes) {
                    latestEndMinutes = endMinutes;
                }
            }

            // Cooldown Logic Application
            if (isWithinAnyShift) {
                // If admin manually changed status (e.g to TIDAK_PRAKTEK / SELESAI / AKAN_BUKA), respect the cooldown!
                if (!isCooldownActive && doc.status !== 'PENUH' && (doc.status === 'TIDAK_PRAKTEK' || doc.status === 'SELESAI' || doc.status === 'AKAN_BUKA' || doc.status === 'TIDAK PRAKTEK' as any)) {
                    const targetStatus = activeShiftStatusOverride || 'BUKA';
                    console.log(`[automation DEBUG] ${doc.name} (id ${doc.id}) is WITHIN SHIFT. No cooldown active. Updating to ${targetStatus} from ${doc.status}`);
                    updates.push({ id: doc.id, status: targetStatus });
                }
            } else if (isAfterAllShifts && latestEndMinutes > 0) {
                // End of Day Sweep: Ignores Cooldown to ensure nobody is left stuck "BUKA" over night
                if (doc.status === 'BUKA' || doc.status === 'PENUH' || doc.status === 'TIDAK_PRAKTEK' || doc.status === 'AKAN_BUKA' || doc.status === 'TIDAK PRAKTEK' as any) {
                    console.log(`[automation DEBUG] ${doc.name} (id ${doc.id}) is AFTER ALL SHIFTS. Current is ${doc.status}. Sweeping to SELESAI.`);
                    updates.push({ id: doc.id, status: 'SELESAI' });
                }
            } else if (!isWithinAnyShift && !isAfterAllShifts) {
                // Before shifts begin OR during a break between shifts
                if (!isCooldownActive && (doc.status === 'SELESAI' || doc.status === 'BUKA' || doc.status === 'PENUH' || doc.status === 'TIDAK_PRAKTEK' || doc.status === 'AKAN_BUKA' || doc.status === 'TIDAK PRAKTEK' as any)) {
                    // Find the next upcoming shift to see if it has a special override (PENUH/OPERASI)
                    const nextShift = todayShifts
                        .filter(s => {
                            const start = parseTimeToMinutes(s.formattedTime?.split('-')[0]);
                            return start !== null && start > currentTimeMinutes;
                        })
                        .sort((a, b) => {
                            const startA = parseTimeToMinutes(a.formattedTime?.split('-')[0]) || 0;
                            const startB = parseTimeToMinutes(b.formattedTime?.split('-')[0]) || 0;
                            return startA - startB;
                        })[0];

                    const override = nextShift?.statusOverride;
                    const targetStatus = (override === 'PENUH' || override === 'OPERASI') ? override : 'AKAN_BUKA';

                    console.log(`[automation DEBUG] ${doc.name} (id ${doc.id}) is BEFORE or BETWEEN shifts. Updating to ${targetStatus} from ${doc.status}`);
                    updates.push({ id: doc.id, status: targetStatus as any });
                }
            }
        }

        try {
            if (updates.length > 0) {
                try {
                    // Try queue-based approach first (with retry/backoff)
                    try {
                        const { getAutomationQueue } = await import('./automation-queue');
                        const queue = getAutomationQueue();
                        // ONLY add to queue if it's explicitly initialized and connected
                        // otherwise we fallback to the bulk API
                        if (queue.isReady()) {
                            await queue.addBatch(updates);
                            applied = updates.length;
                            console.debug('[automation] queued', updates.length, 'jobs');
                        } else {
                            throw new Error('Queue not ready');
                        }
                    } catch (queueErr) {
                        // Suppress logs if we are in dev/local and explicitly lacking redis 
                        const isNoQueueError = queueErr instanceof Error && queueErr.message === 'Queue not ready';
                        if (!isNoQueueError) {
                            console.debug('[automation] queue unavailable, using bulk API:', queueErr instanceof Error ? queueErr.message : String(queueErr));
                        }

                        // Fallback to bulk API endpoint
                        const fallbackRes = await fetch('http://localhost:3000/api/doctors?action=bulk', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Cookie': `medcore_session=${process.env.ADMIN_KEY}`
                            },
                            body: JSON.stringify(updates)
                        });
                        if (!fallbackRes.ok) throw new Error(`Bulk API failed: ${fallbackRes.status}`);
                        applied = updates.length;
                    }
                } catch (fallbackErr) {
                    console.debug('[automation] bulk API failed, falling back to direct db update:', fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
                    // fallback to individual updates with concurrency limit
                    const concurrency = 5;
                    for (let i = 0; i < updates.length; i += concurrency) {
                        const chunk = updates.slice(i, i + concurrency);
                        const promises = chunk.map(u =>
                            prisma.doctor.update({ where: { id: String(u.id) }, data: { status: u.status as any } })
                        );
                        const results = await Promise.allSettled(promises);
                        results.forEach(r => r.status === 'fulfilled' ? applied++ : failed++);
                    }
                }
            }
        } catch (err) {
            error = (err as any)?.message ?? String(err);
            throw err;
        }

        if (applied > 0) {
            // notify any listeners about which doctors changed
            notifyDoctorUpdates(updates.map(u => ({ id: u.id })));

            try {
                // Force Vercel to purge the static Edge Cache for the TV display
                revalidatePath('/api/display');
            } catch (cacheErr) {
                console.error('[automation] Failed to revalidate display cache:', cacheErr);
            }
        }
    } catch (err) {
        const errMsg = (err as any)?.message ?? String(err);
        console.error('[automation] run failed:', errMsg);
        error = errMsg;
    } finally {
        // Record run to automationLog
        const duration = Date.now() - runStartTime;
        if ((prisma as any).automationLog) {
            try {
                await (prisma as any).automationLog.create({
                    data: {
                        type: error ? 'error' : 'run',
                        details: {
                            applied,
                            failed,
                            error,
                            durationMs: duration,
                            timestamp: new Date().toISOString()
                        }
                    }
                });
            } catch (writeErr) {
                console.error('failed writing automationLog', writeErr);
            }
        }
    }

    return { applied, failed };
}
