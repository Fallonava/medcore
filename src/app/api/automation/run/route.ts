import { NextRequest, NextResponse } from 'next/server';
import { runAutomation } from '@/lib/automation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Check for Vercel Cron authorization header
    const authHeaderRaw = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuth = cronSecret && authHeaderRaw === `Bearer ${cronSecret}`;

    if (!isCronAuth) {
        // Fallback to unified session (supports JWT cookie OR Bearer ADMIN_KEY)
        const { requirePermission } = await import('@/lib/api-utils');
        const authErr = await requirePermission(req, 'automation', 'write');
        if (authErr) return authErr;
    }

    try {
        const result = await runAutomation();
        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
