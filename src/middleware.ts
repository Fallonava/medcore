import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ─── Constants (must match auth.ts) ───
const ACCESS_COOKIE = 'medcore_session';
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// ─── Public routes that do NOT require authentication ───
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/create-superadmin',
  '/api/display',         // TV display endpoint (public)
  '/api/stream/live',     // SSE live stream for TV displays
  '/api/seed',            // Database seeding
];

// Prefixes that are always public (static assets, Next.js internals)
const PUBLIC_PREFIXES = [
  '/_next',
  '/icon',
  '/sw.js',
  '/manifest',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Prefix match (static assets, Next internals)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // File extensions (images, fonts, etc.)
  if (/\.(svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot|css|js|map)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth check
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // ─── API routes: check Bearer token OR cookie ───
  const isApiRoute = pathname.startsWith('/api/');

  // For API routes, also allow ADMIN_KEY / CRON_SECRET bypass
  if (isApiRoute) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const adminKey = process.env.ADMIN_KEY;
      const cronSecret = process.env.CRON_SECRET;
      // Internal service call — bypass JWT verification
      if ((adminKey && token === adminKey) || (cronSecret && token === cronSecret)) {
        return NextResponse.next();
      }
    }
  }

  // ─── Check access token from cookie ───
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    // No token: redirect pages to login, return 401 for APIs
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'NO_TOKEN' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Verify JWT ───
  try {
    const { payload } = await jwtVerify(accessToken, ACCESS_SECRET);

    // Inject user info into request headers for downstream RSC/API usage
    const response = NextResponse.next();
    response.headers.set('x-user-id', String(payload.userId ?? ''));
    response.headers.set('x-user-role', String(payload.roleName ?? ''));
    response.headers.set('x-user-name', String(payload.name ?? ''));

    // Encode permissions as JSON header for API routes
    if (payload.permissions) {
      response.headers.set(
        'x-user-permissions',
        JSON.stringify(payload.permissions)
      );
    }

    return response;
  } catch {
    // Token expired or invalid
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      );
    }
    // For pages: redirect to login with return URL
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// ─── Matcher: run middleware on all routes except public file extensions ───
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, etc.
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
