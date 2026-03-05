import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';
import { logAuditAction } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { invalidateRbacCache } from '@/lib/rbac-cache';

export const dynamic = 'force-dynamic';

// GET /api/roles — List all roles with permissions
export async function GET(req: Request) {
  const authErr = await requirePermission(req, 'access', 'read');
  if (authErr) return authErr;

  const roles = await prisma.role.findMany({
    include: {
      permissions: true,
      _count: { select: { users: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(roles);
}

// POST /api/roles — Create a new role with permissions
export async function POST(req: Request) {
  const authErr = await requirePermission(req, 'access', 'write');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { name, description, permissions } = body;
    // permissions: [{ resource: string, action: string }]

    if (!name) {
      return NextResponse.json({ error: 'Nama role wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Nama role sudah digunakan' }, { status: 409 });
    }

    const newRole = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: {
          create: (permissions || []).map((p: { resource: string; action: string }) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      },
      include: { permissions: true, _count: { select: { users: true } } },
    });

    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'CREATE_ROLE',
      resource: 'roles',
      details: { roleId: newRole.id, roleName: newRole.name, permissionsCount: newRole.permissions.length },
      req,
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (err) {
    console.error('[Roles POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/roles — Update role and replace permissions
export async function PUT(req: Request) {
  const authErr = await requirePermission(req, 'access', 'write');
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json({ error: 'Role ID wajib diisi' }, { status: 400 });
    }

    // Check system role protection
    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing?.isSystem && name !== existing.name) {
      return NextResponse.json({ error: 'Nama role sistem tidak dapat diubah' }, { status: 403 });
    }

    // Delete old permissions and replace with new ones
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description ?? undefined,
        permissions: {
          create: (permissions || []).map((p: { resource: string; action: string }) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      },
      include: { permissions: true, _count: { select: { users: true } } },
    });

    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'UPDATE_ROLE',
      resource: 'roles',
      details: { roleId: updated.id, roleName: updated.name, newPermissionsCount: updated.permissions.length },
      req,
    });

    // Invalidate RBAC permission cache for all users assigned to this role
    const affectedUsers = await prisma.user.findMany({ where: { roleId: id }, select: { id: true } });
    await Promise.all(affectedUsers.map(u => invalidateRbacCache(u.id)));

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[Roles PUT]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/roles — Delete role (system roles protected)
export async function DELETE(req: Request) {
  const authErr = await requirePermission(req, 'access', 'write');
  if (authErr) return authErr;

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Role ID wajib diisi' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing?.isSystem) {
      return NextResponse.json({ error: 'Role sistem tidak dapat dihapus' }, { status: 403 });
    }

    const deletedRole = await prisma.role.delete({ where: { id } });
    
    const session = await getSession(req);
    await logAuditAction({
      userId: session?.userId,
      action: 'DELETE_ROLE',
      resource: 'roles',
      details: { roleId: deletedRole.id, roleName: deletedRole.name },
      req,
    });
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Roles DELETE]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
