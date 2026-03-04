import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';import { ensureSuperAdmin } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';

// POST /api/auth/promote-superadmin
// Body: { username: string, adminKey: string }
// Hanya boleh dipanggil dengan ADMIN_KEY yang sama seperti di .env
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, adminKey } = body as { username?: string; adminKey?: string };

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!username) {
      return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });
    }

    // Pastikan role Super Admin dan user default sudah ada
    await ensureSuperAdmin();

    const superRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (!superRole) {
      return NextResponse.json({ error: 'Role Super Admin tidak ditemukan' }, { status: 500 });
    }

    const user = await prisma.user.update({
      where: { username },
      data: { roleId: superRole.id },
    });

    await logAuditAction({
      userId: user.id, // Explicitly the user who was promoted
      action: 'PROMOTE_SUPERADMIN',
      resource: 'system',
      details: { promotedUsername: username },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `User ${username} sekarang menjadi Super Admin.`,
      userId: user.id,
      roleId: user.roleId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Promote SuperAdmin Error]', message, err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

