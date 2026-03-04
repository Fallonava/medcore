import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.ADMIN_KEY || 'fallback-secret-key'
);

const ACCESS_COOKIE  = 'medcore_session';
const REFRESH_COOKIE = 'medcore_refresh';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||      // login, logout, refresh, me — all public
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/tv.html' ||
    pathname.startsWith('/api/display') ||
    pathname.startsWith('/api/stream/live') ||
    pathname.startsWith('/api/automation');

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ── Server-to-server bypass (internal automation calls) ──
  // Requests from automation.ts or cron jobs use Authorization: Bearer <ADMIN_KEY|CRON_SECRET>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const adminKey = process.env.ADMIN_KEY;
    const cronSecret = process.env.CRON_SECRET;
    if ((adminKey && token === adminKey) || (cronSecret && token === cronSecret)) {
      return NextResponse.next();
    }
  }

  const accessToken   = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken  = request.cookies.get(REFRESH_COOKIE)?.value;

  // ── 1. Try the access token ──
  if (accessToken) {
    try {
      await jwtVerify(accessToken, ACCESS_SECRET);
      return NextResponse.next(); // Valid access token → allow through
    } catch {
      // Access token expired — fall through to try refresh
    }
  }

  // ── 2. Access token missing or expired → try silent refresh via refresh cookie ──
  if (refreshToken) {
    // For API routes: return 401 so the client can call /api/auth/refresh
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Access token expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }

    // For page routes: redirect to GET /api/auth/refresh which rotates
    // the token server-side and redirects back to the original page.
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    refreshUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(refreshUrl);
  }

  // ── 3. No tokens at all → unauthenticated ──
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
