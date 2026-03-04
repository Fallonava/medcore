import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import {
  revokeRefreshToken,
  revokeAllRefreshTokens,
  getSession,
  clearAuthCookies,
} from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

/**
 * POST /api/auth/logout
 * Body (optional): { all: true }  → revoke all devices
 * Default: revoke only current device's refresh token
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get('medcore_refresh')?.value;

    // Try to get the user from the (possibly expired) access token for audit
    let userId: string | undefined;
    try {
      const session = await getSession(req);
      userId = session?.userId;
    } catch { /* expired access token is fine during logout */ }

    let revokedAll = false;

    if (rawRefreshToken) {
      let body: { all?: boolean } = {};
      try { body = await req.json(); } catch { /* no body is fine */ }

      if (body.all && userId) {
        await revokeAllRefreshTokens(userId);
        revokedAll = true;
      } else {
        await revokeRefreshToken(rawRefreshToken);
      }
    }

    if (userId) {
      await logAuditAction({
        userId,
        action: revokedAll ? 'LOGOUT_ALL_DEVICES' : 'LOGOUT',
        req,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: revokedAll ? 'Logged out from all devices' : 'Logged out successfully',
    });

    clearAuthCookies(response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Logout Error]', message);
    // Still clear cookies even on error
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    clearAuthCookies(response);
    return response;
  }
}

export async function GET() {
  const response = NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  );
  clearAuthCookies(response);
  return response;
}
