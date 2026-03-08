/**
 * Auth Module Tests
 *
 * Tests password hashing, RBAC permission helpers, and token lifecycle.
 * jose/JWT functions are tested via the mock to avoid ESM import issues
 * with the next/jest preset.
 */

// Must set env vars BEFORE importing auth module
process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long!!';
process.env.ADMIN_KEY = 'test-admin-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

// Mock jose (ESM-only) to avoid transform issues in jest
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation((payload) => {
    return {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue('mock-jwt-token.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.mock-sig'),
    };
  }),
  jwtVerify: jest.fn().mockImplementation(async (token: string) => {
    // Decode the payload from our mock format
    const parts = token.split('.');
    if (parts.length !== 3 || parts[2] !== 'mock-sig') {
      throw new Error('Invalid token');
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return { payload };
  }),
}));

// Mock prisma to avoid DB connections in test
jest.mock('@/lib/prisma', () => ({
  prisma: {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock rbac-cache
jest.mock('@/lib/rbac-cache', () => ({
  getCachedPermissions: jest.fn().mockResolvedValue(null),
  setCachedPermissions: jest.fn().mockResolvedValue(undefined),
  invalidateRbacCache: jest.fn().mockResolvedValue(undefined),
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}));

import { hashPassword, verifyPassword, createAccessToken, verifyToken, canRead, canWrite } from '@/lib/auth';
import type { SessionPayload } from '@/lib/auth-shared';

describe('Auth Module', () => {

  // ─── Password Utilities ───
  describe('Password Hashing', () => {
    it('should hash and verify a password correctly', async () => {
      const password = 'secureP@ssw0rd!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
      expect(await verifyPassword(password, hashed)).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hashed = await hashPassword('correctPassword');
      expect(await verifyPassword('wrongPassword', hashed)).toBe(false);
    });

    it('should produce different hashes for same password (salted)', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ─── JWT Access Tokens ───
  describe('JWT Access Tokens', () => {
    const mockSession: SessionPayload = {
      userId: 'user-123',
      username: 'admin',
      name: 'Test Admin',
      roleId: 'role-1',
      roleName: 'Super Admin',
      permissions: [
        { resource: 'doctors', action: 'read' },
        { resource: 'doctors', action: 'write' },
        { resource: 'schedules', action: 'read' },
      ],
    };

    it('should create a token string', async () => {
      const token = await createAccessToken(mockSession);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should verify and return payload data', async () => {
      const token = await createAccessToken(mockSession);
      const verified = await verifyToken(token);
      expect(verified).not.toBeNull();
      expect(verified!.userId).toBe('user-123');
      expect(verified!.username).toBe('admin');
      expect(verified!.roleName).toBe('Super Admin');
    });

    it('should return null for an invalid token', async () => {
      const result = await verifyToken('completely.invalid.token');
      expect(result).toBeNull();
    });

    it('should include permissions in the payload', async () => {
      const token = await createAccessToken(mockSession);
      const verified = await verifyToken(token);
      expect(verified!.permissions).toHaveLength(3);
      expect(verified!.permissions[0]).toEqual({ resource: 'doctors', action: 'read' });
    });
  });

  // ─── RBAC Permission Helpers ───
  describe('Permission Helpers', () => {
    const adminSession: SessionPayload = {
      userId: 'user-1',
      username: 'admin',
      name: 'Admin',
      roleId: 'role-1',
      roleName: 'Super Admin',
      permissions: [],
    };

    const limitedSession: SessionPayload = {
      userId: 'user-2',
      username: 'nurse',
      name: 'Nurse',
      roleId: 'role-2',
      roleName: 'Nurse',
      permissions: [
        { resource: 'doctors', action: 'read' },
        { resource: 'schedules', action: 'write' },
      ],
    };

    it('Super Admin should have read access to everything', () => {
      expect(canRead(adminSession, 'doctors')).toBe(true);
      expect(canRead(adminSession, 'users')).toBe(true);
      expect(canRead(adminSession, 'analytics')).toBe(true);
    });

    it('Super Admin should have write access to everything', () => {
      expect(canWrite(adminSession, 'doctors')).toBe(true);
      expect(canWrite(adminSession, 'users')).toBe(true);
    });

    it('Limited user can read their granted resources', () => {
      expect(canRead(limitedSession, 'doctors')).toBe(true);
      expect(canRead(limitedSession, 'schedules')).toBe(true);
    });

    it('Limited user cannot read non-granted resources', () => {
      expect(canRead(limitedSession, 'users')).toBe(false);
      expect(canRead(limitedSession, 'analytics')).toBe(false);
    });

    it('Write permission also grants read access', () => {
      expect(canRead(limitedSession, 'schedules')).toBe(true);
    });

    it('Read-only permission does not grant write access', () => {
      expect(canWrite(limitedSession, 'doctors')).toBe(false);
    });

    it('Null session should deny all access', () => {
      expect(canRead(null, 'doctors')).toBe(false);
      expect(canWrite(null, 'doctors')).toBe(false);
    });
  });
});
