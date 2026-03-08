import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SettingsUpdateSchema = z.object({
    automationEnabled: z.boolean().optional(),
    simMode: z.boolean().optional(),
    bufferMinutes: z.number().int().min(0).optional(),
    operationMinutes: z.number().int().min(0).optional(),
    maxShiftHours: z.number().int().min(0).optional(),
});

export async function GET() {
    const all = await prisma.settings.findMany();
    const settings = all.length > 0 ? all[0] : null;
    if (settings) {
        return NextResponse.json({ ...settings, id: Number(settings.id) });
    }
    return NextResponse.json({ id: 1, automationEnabled: false });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = SettingsUpdateSchema.parse(body);

        const all = await prisma.settings.findMany();
        const current = all.length > 0 ? all[0] : null;

        if (current) {
            const updated = await prisma.settings.update({
                where: { id: current.id },
                data: validated
            });
        return NextResponse.json({ ...updated, id: Number(updated.id) });
    } else {
            const newSettings = await prisma.settings.create({ data: validated });
            return NextResponse.json({ ...newSettings, id: Number(newSettings.id) });
        }
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
