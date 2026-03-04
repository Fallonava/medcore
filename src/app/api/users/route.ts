import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, getSession } from '@/lib/auth';
import { requirePermission } from '@/lib/api-utils';
import { logAuditAction } from '@/lib/audit';

// GET /api/users — List all users
export async function GET(req: Request) {
  const authErr = await requirePermission(req, 'users', 'read');
  if (authErr) return authErr;

  const users = await prisma.user.findMany({
    include: { role: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Strip password from response
  const safeUsers = users.map(({ password, ...rest }) => rest);
  return NextResponse.json(safeUsers);
}

// POST /api/users — Create a new user
export async function POST(req: Request) {
  const authErr = await requirePermission(req, 'users', 'write');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { username, password, name, roleId } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'Username, password, dan nama wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, password: hashed, name, roleId: roleId || null },
      include: { role: { select: { id: true, name: true } } },
    });

    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'CREATE_USER',
      resource: 'users',
      details: { createdUserId: user.id, username: user.username },
      req,
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (err) {
    console.error('[Users POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/users — Update user (expects { id, ...fields })
export async function PUT(req: Request) {
  const authErr = await requirePermission(req, 'users', 'write');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, password, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: { select: { id: true, name: true } } },
    });

    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'UPDATE_USER',
      resource: 'users',
      details: { updatedUserId: user.id, username: user.username, fields: Object.keys(rest) },
      req,
    });

    const { password: _, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (err) {
    console.error('[Users PUT]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/users — Delete user (expects { id })
export async function DELETE(req: Request) {
  const authErr = await requirePermission(req, 'users', 'write');
  if (authErr) return authErr;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID wajib diisi' }, { status: 400 });
    }

    const deletedUser = await prisma.user.delete({ where: { id } });
    
    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'DELETE_USER',
      resource: 'users',
      details: { deletedUserId: deletedUser.id, username: deletedUser.username },
      req,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Users DELETE]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
