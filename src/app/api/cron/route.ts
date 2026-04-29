export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { runAutomation } from '@/lib/automation';
import { logger } from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify Authorization header if CRON_SECRET is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('[cron] Starting automation run from edge cron trigger');
    const { applied, failed } = await runAutomation();

    return NextResponse.json({
      success: true,
      message: 'Automation run completed',
      applied,
      failed,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`[cron] Automation failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
