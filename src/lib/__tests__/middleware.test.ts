/**
 * Middleware Logic Tests
 *
 * Tests the route classification logic used by middleware.
 * Since next/server and jose are ESM-only, we test the logic
 * by extracting and directly testing the route classification.
 */

process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long!!';
process.env.ADMIN_KEY = 'test-admin-key';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

// ─── Extracted route classification logic (mirrors middleware.ts) ───
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/create-superadmin',
  '/api/display',
  '/api/stream/live',
  '/api/seed',
];

const PUBLIC_PREFIXES = [
  '/_next',
  '/icon',
  '/sw.js',
  '/manifest',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (/\.(svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot|css|js|map)$/i.test(pathname)) return true;
  return false;
}

function isInternalServiceRequest(bearer: string | null): boolean {
  if (!bearer) return false;
  const adminKey = process.env.ADMIN_KEY;
  const cronSecret = process.env.CRON_SECRET;
  return (!!adminKey && bearer === adminKey) || (!!cronSecret && bearer === cronSecret);
}


describe('Middleware Route Classification', () => {

  // ─── Public Routes ───
  describe('Public Route Detection', () => {
    it('should identify /login as public', () => {
      expect(isPublicRoute('/login')).toBe(true);
    });

    it('should identify /api/auth/login as public', () => {
      expect(isPublicRoute('/api/auth/login')).toBe(true);
    });

    it('should identify /api/auth/refresh as public', () => {
      expect(isPublicRoute('/api/auth/refresh')).toBe(true);
    });

    it('should identify /api/display as public', () => {
      expect(isPublicRoute('/api/display')).toBe(true);
    });

    it('should identify /api/stream/live as public', () => {
      expect(isPublicRoute('/api/stream/live')).toBe(true);
    });

    it('should identify /_next/static paths as public', () => {
      expect(isPublicRoute('/_next/static/chunks/main.js')).toBe(true);
    });

    it('should identify static file extensions as public', () => {
      expect(isPublicRoute('/icon.svg')).toBe(true);
      expect(isPublicRoute('/image.png')).toBe(true);
      expect(isPublicRoute('/font.woff2')).toBe(true);
      expect(isPublicRoute('/styles.css')).toBe(true);
    });
  });

  // ─── Protected Routes ───
  describe('Protected Route Detection', () => {
    it('should identify / as protected', () => {
      expect(isPublicRoute('/')).toBe(false);
    });

    it('should identify /api/doctors as protected', () => {
      expect(isPublicRoute('/api/doctors')).toBe(false);
    });

    it('should identify /analytics as protected', () => {
      expect(isPublicRoute('/analytics')).toBe(false);
    });

    it('should identify /api/users as protected', () => {
      expect(isPublicRoute('/api/users')).toBe(false);
    });

    it('should identify /settings as protected', () => {
      expect(isPublicRoute('/settings')).toBe(false);
    });

    it('should identify /automation as protected', () => {
      expect(isPublicRoute('/automation')).toBe(false);
    });
  });

  // ─── Internal Service Authentication ───
  describe('Internal Service Request Detection', () => {
    it('should recognize ADMIN_KEY as internal service', () => {
      expect(isInternalServiceRequest('test-admin-key')).toBe(true);
    });

    it('should recognize CRON_SECRET as internal service', () => {
      expect(isInternalServiceRequest('test-cron-secret')).toBe(true);
    });

    it('should reject unknown tokens', () => {
      expect(isInternalServiceRequest('random-token')).toBe(false);
    });

    it('should reject null bearer', () => {
      expect(isInternalServiceRequest(null)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isInternalServiceRequest('')).toBe(false);
    });
  });
});
