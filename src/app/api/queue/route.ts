
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
        // Reset lastCall for all doctors
        await prisma.doctor.updateMany({
            data: {
                lastCall: null
            }
        });
        return NextResponse.json({ success: true, message: "Queue reset." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
