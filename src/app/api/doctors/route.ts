import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireAdmin, requirePermission } from '@/lib/api-utils';
import { notifyDoctorUpdates } from '@/lib/automation-broadcaster';

export const dynamic = 'force-dynamic';

// Validation schemas
const DoctorStatusEnum = z.enum(['BUKA', 'PENUH', 'OPERASI', 'AKAN_BUKA', 'CUTI', 'SELESAI', 'TIDAK_PRAKTEK', 'TIDAK PRAKTEK'])
    .transform(val => (val === 'TIDAK PRAKTEK' || val === 'TIDAK_PRAKTEK') ? 'TIDAK_PRAKTEK' : val as any);

const BulkUpdateSchema = z.array(
    z.object({
        id: z.union([z.string(), z.number()]).transform(String),
        status: DoctorStatusEnum.optional(),
    }).strict()
);

const CreateDoctorSchema = z.object({
    name: z.string().min(1).max(255),
    specialty: z.string().min(1).max(255),
    status: z.any(),
    category: z.enum(['Bedah', 'NonBedah']),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
    queueCode: z.string().optional(),
    lastCall: z.string().nullable().optional(),
    registrationTime: z.string().nullable().optional(),
    lastManualOverride: z.number().optional(),
});

const UpdateDoctorSchema = CreateDoctorSchema.partial().extend({
    id: z.string(),
});

export async function GET() {
    const doctors = await prisma.doctor.findMany({
        orderBy: [
            { order: 'asc' },
            { specialty: 'asc' },
            { name: 'asc' }
        ]
    });
    const shifts = await (prisma.shift as any).findMany();

    // Calculate Today's Index (0=Senin, ..., 6=Minggu) using WIB timezone
    const now = new Date();
    const wibNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const jsDay = wibNow.getUTCDay();
    const todayIdx = (jsDay + 6) % 7;

    const enhancedDoctors = doctors.map(doc => {
        const todayShift = (shifts as any[]).find(s => s.doctorId === doc.id && s.dayIdx === todayIdx);
        return {
            ...doc,
            lastManualOverride: doc.lastManualOverride ? Number(doc.lastManualOverride) : undefined,
            currentRegistrationTime: todayShift?.registrationTime || doc.registrationTime
        };
    });

    return NextResponse.json(enhancedDoctors);
}

export async function POST(req: Request) {
    // doctors:write permission required for all mutations
    const authErr = await requirePermission(req, 'doctors', 'write');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
        await prisma.doctor.updateMany({
            data: {
                status: 'TIDAK_PRAKTEK',
                queueCode: '',
                lastCall: null,
                registrationTime: null,
                lastManualOverride: null
            }
        });
        const docs = await prisma.doctor.findMany({ select: { id: true } });
        notifyDoctorUpdates(docs.map(d => ({ id: String(d.id) })));
        return NextResponse.json({ success: true, message: "All doctors reset." });
    }

    if (action === 'bulk') {
        try {
            const body = await req.json();
            const validated = BulkUpdateSchema.parse(body);

            const results = await prisma.$transaction(
                validated.map((update) => {
                    const { id, ...data } = update;
                    return prisma.doctor.update({
                        where: { id },
                        data: data as any
                    });
                })
            );
            notifyDoctorUpdates(validated.map(u => ({ id: u.id })));
            return NextResponse.json({ success: true, count: results.length });
        } catch (err) {
            if (err instanceof z.ZodError) {
                return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
            }
            return NextResponse.json({ error: String(err) }, { status: 500 });
        }
    }

    if (action === 'reorder') {
        try {
            const body = await req.json(); // Array of { id, order }
            await prisma.$transaction(
                body.map((item: { id: string, order: number }) => 
                    prisma.doctor.update({
                        where: { id: String(item.id) },
                        data: { order: Number(item.order) }
                    })
                )
            );
            return NextResponse.json({ success: true });
        } catch (err) {
            return NextResponse.json({ error: String(err) }, { status: 500 });
        }
    }

    // Create new doctor
    try {
        const body = await req.json();
        const validated = CreateDoctorSchema.parse(body);

        const newDoctor = await prisma.doctor.create({ data: validated as any });
        return NextResponse.json({
            ...newDoctor,
            lastManualOverride: newDoctor.lastManualOverride ? Number(newDoctor.lastManualOverride) : undefined
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'doctors', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const validated = UpdateDoctorSchema.parse(body);
        const { id, ...data } = validated;

        const updated = await prisma.doctor.update({
            where: { id },
            data: data as any
        });

        notifyDoctorUpdates([{ id: String(updated.id) }]);

        return NextResponse.json({
            ...updated,
            lastManualOverride: updated.lastManualOverride ? Number(updated.lastManualOverride) : undefined
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const authErr = await requirePermission(req, 'doctors', 'write');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await prisma.doctor.delete({
        where: { id: String(id) }
    });
    return NextResponse.json({ success: true });
}
