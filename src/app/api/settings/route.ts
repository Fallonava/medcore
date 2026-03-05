import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const all = await prisma.settings.findMany();
    const settings = all.length > 0 ? all[0] : null;
    if (settings) {
        return NextResponse.json({ ...settings, id: Number(settings.id) });
    }
    return NextResponse.json({ id: 1, automationEnabled: false });
}

export async function POST(req: Request) {
    const body = await req.json();
    const all = await prisma.settings.findMany();
    const current = all.length > 0 ? all[0] : null;

    if (current) {
        // Exclude ID from updates, handle properly
        const { id, ...updates } = body;
        const updated = await prisma.settings.update({
            where: { id: current.id },
            data: updates
        });
        return NextResponse.json({ ...updated, id: Number(updated.id) });
    } else {
        const newSettings = await prisma.settings.create({ data: body });
        return NextResponse.json({ ...newSettings, id: Number(newSettings.id) });
    }
}
