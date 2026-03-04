import { prisma } from './prisma';

export async function logAuditAction(params: {
  userId?: string;
  action: string;
  resource?: string;
  details?: Record<string, any>;
  req?: Request;
}) {
  try {
    let ipAddress = 'unknown';

    // Try to extract IP from request headers if provided
    if (params.req) {
      const forwarded = params.req.headers.get('x-forwarded-for');
      const realIp = params.req.headers.get('x-real-ip');
      ipAddress = forwarded ? forwarded.split(',')[0].trim() : (realIp || 'unknown');
    }

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        details: params.details || {},
        ipAddress,
      },
    });
  } catch (err) {
    console.error('[Audit Log Error]', err);
  }
}
