import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

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
        const { doctor, ...data } = body;

        // Ensure id is not passed as null to create
        if (data.id === null) delete data.id;

        // Ensure timeIdx is set (required in schema)
        if (data.timeIdx === undefined || data.timeIdx === null) {
            data.timeIdx = 0;
        }

        const newShift = await prisma.shift.create({ data });
        return NextResponse.json(newShift);
    } catch (e) {
        console.error("Shift POST Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'schedules', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const { id, doctor, ...updates } = body;

        const updated = await (prisma.shift as any).update({
            where: { id: String(id) },
            data: updates
        });
        return NextResponse.json(updated);
    } catch (e) {
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
