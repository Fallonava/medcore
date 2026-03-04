import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, ensureSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
// POST /api/auth/create-superadmin
// Body: { username, password, name, adminKey }
// Temporary endpoint to create a new super admin account
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password, name, adminKey } = body as {
      username?: string;
      password?: string;
      name?: string;
      adminKey?: string;
    };

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, dan nama wajib diisi' },
        { status: 400 }
      );
    }

    // Ensure role exists
    await ensureSuperAdmin();

    const superRole = await prisma.role.findUnique({
      where: { name: 'Super Admin' },
    });

    if (!superRole) {
      return NextResponse.json(
        { error: 'Role Super Admin tidak ditemukan' },
        { status: 500 }
      );
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      // Update password and role
      const hashed = await hashPassword(password);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed, roleId: superRole.id, isActive: true },
      });

      return NextResponse.json({
        success: true,
        message: `User "${username}" password di-reset dan dipromosikan ke Super Admin.`,
        userId: existing.id,
      });
    }

    // Create new user
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        name,
        roleId: superRole.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User "${username}" berhasil dibuat sebagai Super Admin.`,
      userId: user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Create SuperAdmin Error]', message, err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
