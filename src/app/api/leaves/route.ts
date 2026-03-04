import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
    const leaves = await (prisma.leaveRequest as any).findMany({
        include: { doctor: true }
    });

    const mappedLeaves = leaves.map((l: any) => ({
        ...l,
        doctor: l.doctor?.name || 'Unknown'
    }));

    return NextResponse.json(mappedLeaves);
}

export async function POST(req: Request) {
    const authErr = await requirePermission(req, 'leaves', 'write');
    if (authErr) return authErr;

    const data = await req.json();

    if (Array.isArray(data)) {
        const newLeaves = await Promise.all(
            data.map(async (item) => {
                const { dates, doctor, ...rest } = item;
                const doc = await prisma.doctor.findFirst({ where: { name: doctor } });
                if (!doc) return;
                return prisma.leaveRequest.create({
                    data: {
                        ...rest,
                        doctorId: doc.id,
                        status: 'Approved',
                        startDate: new Date(item.startDate),
                        endDate: new Date(item.endDate)
                    }
                });
            })
        );
        return NextResponse.json(newLeaves);
    } else {
        const { dates, doctor, ...rest } = data;
        const doc = await prisma.doctor.findFirst({ where: { name: doctor } });
        if (!doc) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });

        const newLeave = await prisma.leaveRequest.create({
            data: {
                ...rest,
                doctorId: doc.id,
                status: 'Approved',
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
        return NextResponse.json(newLeave);
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'leaves', 'write');
    if (authErr) return authErr;

    const data = await req.json();
    const { id, ...updates } = data;

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.endDate) updates.endDate = new Date(updates.endDate);

        const updatedLeave = await (prisma.leaveRequest as any).update({
            where: { id: String(id) },
            data: updates
        });
        return NextResponse.json(updatedLeave);
    } catch (error) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }
}

export async function DELETE(req: Request) {
    const authErr = await requirePermission(req, 'leaves', 'write');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
        await (prisma.leaveRequest as any).delete({
            where: { id: String(id) }
        });
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
}
