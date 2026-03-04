import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyRefreshToken,
  buildSessionPayload,
  createAccessToken,
  createRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/auth';

/**
 * GET /api/auth/refresh?redirect=/path
 * Browser-triggered token refresh (called when page loads with expired access token).
 * Performs token rotation and redirects back to the original path.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('redirect') || '/';

  const cookieStore = await cookies();
  const rawRefreshToken = cookieStore.get('medcore_refresh')?.value;

  // No refresh token → send to login
  if (!rawRefreshToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const userId = await verifyRefreshToken(rawRefreshToken);
  if (!userId) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    clearAuthCookies(res);
    return res;
  }

  const session = await buildSessionPayload(userId);
  if (!session) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    clearAuthCookies(res);
    return res;
  }

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  const [newAccessToken, newRefreshToken] = await Promise.all([
    createAccessToken(session),
    createRefreshToken(userId, {
      userAgent: req.headers.get('user-agent') ?? undefined,
      ipAddress: ip,
    }),
  ]);

  await revokeRefreshToken(rawRefreshToken);

  // Redirect back to the original page with fresh cookies set
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  setAuthCookies(response, newAccessToken, newRefreshToken);
  return response;
}

/**
 * POST /api/auth/refresh
 * Silently rotates the access token using a valid refresh token.
 * Implements refresh token rotation: old refresh token is revoked after use.
 */
export async function POST(req: Request) {
  const cookieStore = await cookies();
  const rawRefreshToken = cookieStore.get('medcore_refresh')?.value;

  if (!rawRefreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const userId = await verifyRefreshToken(rawRefreshToken);
  if (!userId) {
    // Refresh token invalid/expired/revoked — clear cookies
    const res = NextResponse.json({ error: 'Refresh token expired. Please log in again.' }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const session = await buildSessionPayload(userId);
  if (!session) {
    const res = NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  // ── Refresh Token Rotation ──
  // Revoke the old refresh token first, then issue new pair
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  const [newAccessToken, newRefreshToken] = await Promise.all([
    createAccessToken(session),
    createRefreshToken(userId, {
      userAgent: req.headers.get('user-agent') ?? undefined,
      ipAddress: ip,
    }),
  ]);

  // Revoke old token after issuing new one (prevents gap)
  await revokeRefreshToken(rawRefreshToken);

  const response = NextResponse.json({
    success: true,
    user: {
      name: session.name,
      role: session.roleName,
    },
  });

  setAuthCookies(response, newAccessToken, newRefreshToken);
  return response;
}
