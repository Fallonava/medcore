import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schemas
const ConditionSchema = z.object({
    doctorName: z.string().optional(),
    status: z.string().optional(),
    dateRange: z.string().optional(),
    timeRange: z.string().optional(),
}).strict();

const ActionSchema = z.object({
    status: z.enum(['BUKA', 'PENUH', 'OPERASI', 'CUTI', 'SELESAI', 'TIDAK PRAKTEK']).optional(),
    message: z.string().optional(),
}).strict();

const CreateRuleSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    condition: ConditionSchema,
    action: ActionSchema,
    active: z.boolean().default(true),
});

const UpdateRuleSchema = CreateRuleSchema.extend({
    id: z.union([z.string(), z.number()]).transform(Number),
});

export async function GET(req: Request) {
    const authErr = await requirePermission(req, 'automation', 'read');
    if (authErr) return authErr;

    if (!(prisma as any).automationRule) return NextResponse.json([]);
    const rules = await (prisma as any).automationRule.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json(rules.map((r: any) => ({ ...r, id: Number(r.id) }))); // serialize BigInt
}

export async function POST(req: Request) {
    const authErr = await requirePermission(req, 'automation', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const validated = CreateRuleSchema.parse(body);
        
        if (!(prisma as any).automationRule) {
            return NextResponse.json({ error: 'automationRule model not present' }, { status: 501 });
        }
        
        const created = await (prisma as any).automationRule.create({ data: validated });
        return NextResponse.json({ ...created, id: Number(created.id) });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const authErr = await requirePermission(req, 'automation', 'write');
    if (authErr) return authErr;

    try {
        const body = await req.json();
        const validated = UpdateRuleSchema.parse(body);
        const { id, ...data } = validated;
        
        if (!(prisma as any).automationRule) {
            return NextResponse.json({ error: 'automationRule model not present' }, { status: 501 });
        }
        
        const updated = await (prisma as any).automationRule.update({
            where: { id },
            data
        });
        return NextResponse.json({ ...updated, id: Number(updated.id) });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
        }
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const authErr = await requirePermission(req, 'automation', 'write');
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    if (!(prisma as any).automationRule) return NextResponse.json({ error: 'automationRule model not present' }, { status: 501 });
    await (prisma as any).automationRule.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
