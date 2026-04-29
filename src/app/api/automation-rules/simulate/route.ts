export const runtime = 'edge';
import { simulateRulesBatch } from '@/lib/automation-simulator';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rulesInput = Array.isArray(body.rules) ? body.rules : null;
    const resolutionStrategy = body.resolutionStrategy as string | undefined;

    // fetch data from DB
    const rawDoctors = await prisma.doctor.findMany();
    const doctors = rawDoctors.map(d => ({ ...d, id: String(d.id) }));
    const rawShifts = await prisma.shift.findMany();
    const shifts = rawShifts.map(s => ({ ...s, id: Number(s.id) }));
    const rawLeaves = await prisma.leaveRequest.findMany();
    const leaves = rawLeaves.map(l => ({ ...l, id: Number(l.id) }));

    let rules = rulesInput;
    if (!rules) {
      // if no rules provided, simulate active rules from DB (if model exists)
      rules = (prisma as any).automationRule ? await (prisma as any).automationRule.findMany({ where: { active: true } }) : [];
    }

    const result = simulateRulesBatch(rules, doctors, shifts, leaves, { resolutionStrategy: resolutionStrategy as any });
    // Persist simulation run to AutomationLog (if model exists)
    try {
      if ((prisma as any).automationLog) {
        await (prisma as any).automationLog.create({
          data: {
            type: 'simulation',
            details: {
              rulesCount: Array.isArray(rules) ? rules.length : 0,
              resolutionStrategy: resolutionStrategy ?? null,
              summary: result.summary,
              conflicts: result.conflicts,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    } catch (logErr) {
      console.warn('Failed to write simulation AutomationLog', logErr);
    }

    return Response.json({ success: true, result });
  } catch (err) {
    console.error('[simulate] error', err);
    return Response.json({ success: false, error: (err as any)?.message ?? String(err) }, { status: 500 });
  }
}
