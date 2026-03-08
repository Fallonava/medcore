import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { RESOURCES, SessionPayload } from './auth-shared';
import { getCachedPermissions, setCachedPermissions, invalidateRbacCache } from './rbac-cache';
import { cookies } from 'next/headers';

// ─── Constants ───
// JWT_SECRET is validated as required (≥32 chars) by env.ts (Zod) on startup.
// ADMIN_KEY is intentionally NOT used here — it serves a different purpose
// (server-to-server API bypass) and mixing them would be a security risk.
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is missing. Check your .env file.');
}

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
// Refresh tokens use a separate derived secret for extra security
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_SECRET + '_refresh');

const ACCESS_COOKIE  = 'medcore_session';
const REFRESH_COOKIE = 'medcore_refresh';

export const ACCESS_TOKEN_EXPIRY  = '15m';  // Short-lived
export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

// ─── Password Utilities ───
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Access Token (JWT — short lived) ───
export async function createAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(ACCESS_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Refresh Token (opaque — stored in DB) ───
/**
 * Generate a cryptographically random refresh token, store its hash in DB.
 * Returns the RAW token to be sent to the client (never stored raw).
 */
export async function createRefreshToken(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const rawToken = crypto.randomBytes(48).toString('hex'); // 96 hex chars
  const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000);

  await prisma.refreshToken.create({
    data: {
      token: hashed,
      userId,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  return rawToken;
}

/**
 * Validate a raw refresh token.
 * Returns the userId if valid and not revoked/expired, null otherwise.
 */
export async function verifyRefreshToken(rawToken: string): Promise<string | null> {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return record.userId;
}

/**
 * Revoke a single refresh token (logout from current device).
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { token: hashed },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke ALL refresh tokens for a user (logout from all devices).
 * Also invalidates the RBAC permission cache for this user.
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await Promise.all([
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    invalidateRbacCache(userId),
  ]);
}

// ─── Cookie Helpers ───
const SECURE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
) {
  response.cookies.set(ACCESS_COOKIE,  accessToken,  { ...SECURE_BASE, maxAge: 15 * 60 });
  response.cookies.set(REFRESH_COOKIE, refreshToken, { ...SECURE_BASE, maxAge: REFRESH_TOKEN_EXPIRY });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE,  '', { ...SECURE_BASE, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, '', { ...SECURE_BASE, maxAge: 0 });
}

// ─── Session from Request ───
export async function getSession(request: Request): Promise<SessionPayload | null> {
  // 1. Check Authorization Header (Bearer Token)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Internal/System shortcut: if token matches ADMIN_KEY, return Super Admin session
    const adminKey = process.env.ADMIN_KEY;
    if (adminKey && token === adminKey) {
      return {
        userId: 'system',
        username: 'system',
        name: 'System / Admin Key',
        roleId: 'system',
        roleName: 'Super Admin',
        permissions: RESOURCES.flatMap((r) => [
          { resource: r.key, action: 'read' },
          { resource: r.key, action: 'write' },
        ]),
      };
    }

    return verifyToken(token);
  }

  // 2. Fallback to Cookie (access token)
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookieMap = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const token = cookieMap[ACCESS_COOKIE];
  if (!token) return null;

  return verifyToken(token);
}

// ─── Session from Cookies (Server Actions / RSC) ───
export async function getSessionFromServer(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Permission Helpers ───
export function canRead(session: SessionPayload | null, resource: string): boolean {
  if (!session) return false;
  if (session.roleName === 'Super Admin') return true;
  return session.permissions.some((p) => p.resource === resource && (p.action === 'read' || p.action === 'write'));
}

export function canWrite(session: SessionPayload | null, resource: string): boolean {
  if (!session) return false;
  if (session.roleName === 'Super Admin') return true;
  return session.permissions.some((p) => p.resource === resource && p.action === 'write');
}

// ─── Header-based Permission Helpers (Server Side) ───
export function checkPermission(headers: Headers, resource: string, action: 'read' | 'write'): boolean {
  const roleName = headers.get('x-user-role');
  if (roleName === 'Super Admin') return true;

  const permissionsRaw = headers.get('x-user-permissions');
  if (!permissionsRaw) return false;

  try {
    const permissions = JSON.parse(permissionsRaw) as { resource: string; action: string }[];
    return permissions.some((p) =>
      p.resource === resource && (p.action === action || (action === 'read' && p.action === 'write'))
    );
  } catch {
    return false;
  }
}

// ─── Build Session from DB User (with Redis RBAC cache) ───
export async function buildSessionPayload(userId: string): Promise<SessionPayload | null> {
  // 1. Try Redis cache for permissions (avoids DB lookup)
  const cached = await getCachedPermissions(userId);
  if (cached) {
    // We still need minimal user info — fetch from DB but skip permission join
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, roleId: true, isActive: true, role: { select: { name: true } } },
    });
    if (!user || !user.isActive) return null;
    return {
      userId: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? null,
      permissions: cached,
    };
  }

  // 2. DB fetch (cache miss)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: { permissions: true },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = user.role?.permissions.map((p) => ({ resource: p.resource, action: p.action })) ?? [];

  // 3. Populate cache for next request
  await setCachedPermissions(userId, permissions);

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    roleId: user.roleId,
    roleName: user.role?.name ?? null,
    permissions,
  };
}

// ─── Seed Default Super Admin ───
export async function ensureSuperAdmin() {
  const existingRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });

  let roleId: string;

  if (!existingRole) {
    const role = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Full access to all features',
        isSystem: true,
        permissions: {
          create: RESOURCES.flatMap((r) => [
            { resource: r.key, action: 'read' },
            { resource: r.key, action: 'write' },
          ]),
        },
      },
    });
    roleId = role.id;
  } else {
    roleId = existingRole.id;
  }

  // Seed default admin user if none exists
  const adminCount = await prisma.user.count({ where: { role: { name: 'Super Admin' } } });
  if (adminCount === 0) {
    const hashed = await hashPassword(process.env.ADMIN_KEY || 'admin123');
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashed,
        name: 'Administrator',
        roleId,
      },
    });
    console.log('[RBAC] Default Super Admin created (username: admin, password: ADMIN_KEY from .env)');
  }
}
