import { NextResponse } from 'next/server';
import { getSession, canRead, canWrite } from './auth';

/**
 * Returns true if the request is an internal server-to-server call
 * authenticated via Authorization: Bearer <ADMIN_KEY|CRON_SECRET>.
 * These calls bypass RBAC and are treated as trusted service accounts
 * (automation scheduler, cron jobs, etc.)
 */
function isInternalServiceRequest(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  const adminKey = process.env.ADMIN_KEY;
  const cronSecret = process.env.CRON_SECRET;
  return (!!adminKey && token === adminKey) || (!!cronSecret && token === cronSecret);
}

// Require a logged-in user with Super Admin role
export async function requireAdmin(req: Request) {
  // Allow internal service calls (automation, cron)
  if (isInternalServiceRequest(req)) return null;

  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.roleName !== 'Super Admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

// Require specific resource permission (RBAC)
export async function requirePermission(
  req: Request,
  resource: string,
  action: 'read' | 'write'
) {
  // Allow internal service calls (automation, cron)
  if (isInternalServiceRequest(req)) return null;

  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowed =
    action === 'read' ? canRead(session, resource) : canWrite(session, resource);

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
