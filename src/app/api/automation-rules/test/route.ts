import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Doctor, Shift, LeaveRequest } from '@/lib/data-service';
import { evaluateRules } from '@/lib/automation';
import { requireAdmin } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

// Accepts a rule (or defaults to all active rules) and optional sample data.  
// Returns predicted updates without modifying any records.
export async function POST(req: Request) {
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const body = await req.json();
    const { rule, sampleDoctors, sampleShifts, sampleLeaves, now } = body || {};

    // load data from DB if not provided
    let doctors: Doctor[];
    if (sampleDoctors && Array.isArray(sampleDoctors)) {
        doctors = sampleDoctors;
    } else {
        const raw = await prisma.doctor.findMany();
        doctors = raw.map(d => ({
            ...d,
            id: String(d.id),
            lastManualOverride: d.lastManualOverride !== null ? Number(d.lastManualOverride) : undefined
        })) as unknown as Doctor[];
    }

    let shifts: Shift[];
    if (sampleShifts && Array.isArray(sampleShifts)) {
        shifts = sampleShifts;
    } else {
        const raw = await prisma.shift.findMany();
        shifts = raw.map(s => ({ ...s, id: Number(s.id) })) as unknown as Shift[];
    }

    let leaves: LeaveRequest[];
    if (sampleLeaves && Array.isArray(sampleLeaves)) {
        leaves = sampleLeaves;
    } else {
        const raw = await prisma.leaveRequest.findMany();
        leaves = raw.map(l => ({ ...l, id: Number(l.id) })) as unknown as LeaveRequest[];
    }

    let rules: any[] = [];
    if (rule) {
        rules = Array.isArray(rule) ? rule : [rule];
    } else if ((prisma as any).automationRule) {
        rules = await (prisma as any).automationRule.findMany({ where: { active: true } });
    }

    const timestamp = now ? new Date(now) : undefined;
    const updates = evaluateRules(rules, doctors, shifts, leaves, timestamp);

    return NextResponse.json({ updates });
}
