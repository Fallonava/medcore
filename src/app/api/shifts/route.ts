import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ShiftCreateSchema = z.object({
    doctorId: z.string().min(1),
    dayIdx: z.number().int().min(0).max(6),
    timeIdx: z.number().int().min(0).optional().default(0),
    title: z.string().min(1),
    color: z.string().min(1),
    formattedTime: z.string().min(1),
    registrationTime: z.string().nullable().optional(),
    disabledDates: z.array(z.string()).optional(),
});

const ShiftUpdateSchema = ShiftCreateSchema.partial().extend({
    id: z.string().min(1),
});

export async function GET() {
    const shifts = await (prisma.shift as any).findMany({
        include: { doctor: true }
    });

    const mappedShifts = shifts.map((s: any) => ({
        ...s,
        doctor: s.doctor?.name || 'Unknown'
    }));

    return NextResponse.json(mappedShifts);
}

export async function POST(req: Request) {
    const authErr = await requirePermission(req, 'schedules', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        
        // Ensure id is not passed as null to create (handle incoming data before validation if needed)
        if (body.id === null) delete body.id;

        const validated = ShiftCreateSchema.parse(body);

        const newShift = await prisma.shift.create({ data: validated });
        return NextResponse.json(newShift);
    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 });
        }
        console.error("Shift POST Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'schedules', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const validated = ShiftUpdateSchema.parse(body);
        const { id, ...updates } = validated;

        const updated = await (prisma.shift as any).update({
            where: { id },
            data: updates
        });
        return NextResponse.json(updated);
    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: e.flatten() }, { status: 400 });
        }
        console.error("Shift PUT Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const authErr = await requirePermission(req, 'schedules', 'write');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await (prisma.shift as any).delete({
        where: { id: String(id) }
    });
    return NextResponse.json({ success: true });
}
