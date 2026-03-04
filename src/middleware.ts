import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We do not protect the login route itself, nor the auth API endpoints
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/tv.html" ||
    pathname.startsWith("/api/display") ||
    pathname.startsWith("/api/stream/live") ||
    pathname.startsWith("/api/automation");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("medcore_session");

  // If no valid cookie is found, redirect to login page (or throw 401 for API routes)
  if (!sessionCookie || sessionCookie.value !== process.env.ADMIN_KEY) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Redirect standard browser pages to the login screen
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Ensure the middleware runs on all paths (we exclude static files via the inline check above, but optimizing the matcher helps)
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
