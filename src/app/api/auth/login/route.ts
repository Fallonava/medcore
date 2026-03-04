import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  buildSessionPayload,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  ensureSuperAdmin,
} from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAuditAction } from '@/lib/audit';

const LOGIN_LIMIT  = 5;
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    // ── Rate Limiting ──
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    if (!checkRateLimit(`login_${ip}`, LOGIN_LIMIT, LOGIN_WINDOW)) {
      await logAuditAction({
        action: 'LOGIN_BLOCKED_RATE_LIMIT',
        details: { username, ip },
        req,
      });
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    // Ensure Super Admin exists on first login attempt
    await ensureSuperAdmin();

    // ── Database-backed Login ──
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      await logAuditAction({
        action: 'LOGIN_FAILURE',
        details: { username, reason: 'User not found' },
        req,
      });
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    if (!user.isActive) {
      await logAuditAction({
        userId: user.id,
        action: 'LOGIN_FAILURE_DISABLED',
        details: { username },
        req,
      });
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan. Hubungi administrator.' },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      await logAuditAction({
        userId: user.id,
        action: 'LOGIN_FAILURE',
        details: { username, reason: 'Invalid password' },
        req,
      });
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const session = await buildSessionPayload(user.id);
    if (!session) {
      return NextResponse.json({ error: 'Gagal memuat sesi pengguna' }, { status: 500 });
    }

    // Issue access token (15m) + refresh token (7d)
    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(session),
      createRefreshToken(user.id, {
        userAgent: req.headers.get('user-agent') ?? undefined,
        ipAddress: ip,
      }),
    ]);

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        name: session.name,
        role: session.roleName,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);

    await logAuditAction({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: { username: user.username },
      req,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Login Error]', message, err);
    return NextResponse.json({ error: message || 'Bad Request' }, { status: 400 });
  }
}
