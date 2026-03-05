import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformToPrismaSeeds } from '@/data/doctors-seed-v2';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { doctors, shifts } = transformToPrismaSeeds();

        // Clean DB and reinsert
        await prisma.shift.deleteMany({});
        await prisma.doctor.deleteMany({});

        await prisma.doctor.createMany({ data: doctors as any[] });
        await prisma.shift.createMany({ data: shifts as any[] });

        return NextResponse.json({ success: true, doctors: doctors.length, shifts: shifts.length });
    } catch (err: any) {
        console.error("Seed error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
