import { prisma } from './prisma';
import { unstable_cache } from 'next/cache';

async function fetchDoctorsInner() {
    const doctors = await prisma.doctor.findMany({
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        include: { leaveRequests: true, shifts: true }
    });
    return doctors.map(d => ({
        ...d,
        id: String(d.id),
        lastManualOverride: d.lastManualOverride ? Number(d.lastManualOverride) : null,
    }));
}

async function fetchShiftsInner() {
    const shifts = await (prisma as any).shift.findMany({
        orderBy: [{ dayIdx: 'asc' }, { timeIdx: 'asc' }],
    });
    return shifts.map((s: any) => ({
        ...s,
        id: String(s.id),
        doctorId: String(s.doctorId),
        disabledDates: s.disabledDates || [],
    }));
}

async function fetchLeavesInner() {
    const leaves = await (prisma as any).leaveRequest.findMany({
        where: { status: { not: 'rejected' } },
        orderBy: { startDate: 'asc' }
    });
    return leaves.map((l: any) => ({
        ...l,
        id: String(l.id),
        doctorId: String(l.doctorId),
    }));
}

async function fetchSettingsInner() {
    const s = await prisma.settings.findFirst();
    if (!s) return { id: 'default', automationEnabled: false };
    return { ...s, id: String(s.id) };
}

// ── Edge Caching Optimization ──
// Cache the full snapshot globally at the Edge.
// It will only hit the database once per hour OR when `revalidateTag('snapshot')` is called.
export const getFullSnapshot = unstable_cache(
    async () => {
        const [doctors, shifts, leaves, settings] = await Promise.all([
            fetchDoctorsInner(),
            fetchShiftsInner(),
            fetchLeavesInner(),
            fetchSettingsInner(),
        ]);
        return { doctors, shifts, leaves, settings };
    },
    ['full-snapshot'],
    { tags: ['snapshot'], revalidate: 3600 }
);

export async function fetchDoctors() { return fetchDoctorsInner(); }
export async function fetchShifts() { return fetchShiftsInner(); }
export async function fetchLeaves() { return fetchLeavesInner(); }
export async function fetchSettings() { return fetchSettingsInner(); }
