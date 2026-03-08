import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const LeaveCreateSchema = z.object({
    doctor: z.string().min(1),
    dates: z.any().optional(),
    specialty: z.string().optional().nullable(),
    type: z.string().min(1),
    startDate: z.union([z.string(), z.date()]),
    endDate: z.union([z.string(), z.date()]),
    reason: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
});

const LeaveCreateBulkSchema = z.union([LeaveCreateSchema, z.array(LeaveCreateSchema)]);

const LeaveUpdateSchema = z.object({
    id: z.string().min(1),
    specialty: z.string().optional().nullable(),
    type: z.string().optional(),
    startDate: z.union([z.string(), z.date()]).optional(),
    endDate: z.union([z.string(), z.date()]).optional(),
    reason: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    avatar: z.string().optional().nullable(),
});

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

    try {
        const body = await req.json();
        const data = LeaveCreateBulkSchema.parse(body);

        if (Array.isArray(data)) {
        const newLeaves = await Promise.all(
            data.map(async (item) => {
                const { dates, doctor, ...rest } = item;
                const doc = await prisma.doctor.findFirst({ where: { name: doctor } });
                if (!doc) return;
                return prisma.leaveRequest.create({
                    data: {
                        ...rest,
                        type: item.type as any,
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
                type: data.type as any,
                doctorId: doc.id,
                status: 'Approved',
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
        return NextResponse.json(newLeave);
    }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'leaves', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const validated = LeaveUpdateSchema.parse(body);
        const { id, ...updates } = validated;
        if (updates.startDate) updates.startDate = new Date(updates.startDate);
        if (updates.endDate) updates.endDate = new Date(updates.endDate);

        const updatedLeave = await (prisma.leaveRequest as any).update({
            where: { id: String(id) },
            data: updates
        });
        return NextResponse.json(updatedLeave);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: 'Leave request not found or update failed' }, { status: 404 });
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
