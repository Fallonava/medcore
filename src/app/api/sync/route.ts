export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getFullSnapshot } from '@/lib/data-fetchers';

export async function GET() {
  try {
    const snapshot = await getFullSnapshot();
    return NextResponse.json(snapshot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
