import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const url = new URL(req.url);
    const take = Number(url.searchParams.get('limit') || '100');
    if (!(prisma as any).automationLog) {
        return NextResponse.json([]);
    }
    const logs = await (prisma as any).automationLog.findMany({ orderBy: { createdAt: 'desc' }, take });
    return NextResponse.json(logs);
}
