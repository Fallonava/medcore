export const runtime = 'edge';
import { prisma } from '@/lib/prisma';
import { suggestRules } from '@/lib/automation-heuristics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const suggestions = await suggestRules(prisma as any);
    return Response.json({ success: true, suggestions });
  } catch (err) {
    console.error('[heuristics] suggest error', err);
    return Response.json({ success: false, error: (err as any)?.message || String(err) }, { status: 500 });
  }
}
