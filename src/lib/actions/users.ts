"use server";

import { prisma } from "@/lib/prisma";
import { getSessionFromServer, canWrite, hashPassword } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getUsersAction() {
    const users = await prisma.user.findMany({
        include: { role: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });
    
    return users.map(({ password, ...rest }) => rest);
}

export async function createUserAction(data: any) {
    const session = await getSessionFromServer();
    
    if (!session || !canWrite(session, 'users')) {
        throw new Error("Forbidden");
    }

    const { username, password, name, roleId } = data;
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) throw new Error("Username sudah digunakan");

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
        data: { username, password: hashed, name, roleId: roleId || null },
    });

    await logAuditAction({
        userId: session.userId,
        action: 'CREATE_USER',
        resource: 'users',
        details: { createdUserId: user.id, username: user.username }
    });

    revalidatePath("/settings"); // Assuming users are managed in settings
    return { id: user.id, username: user.username };
}

export async function updateUserAction(id: string, data: any) {
    const session = await getSessionFromServer();
    if (!session || !canWrite(session, 'users')) throw new Error("Forbidden");

    const { password, ...rest } = data;
    const updateData: any = { ...rest };
    
    if (password) {
        updateData.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
        where: { id },
        data: updateData
    });

    await logAuditAction({
        userId: session.userId,
        action: 'UPDATE_USER',
        resource: 'users',
        details: { updatedUserId: user.id, username: user.username, fields: Object.keys(rest) }
    });

    revalidatePath("/settings");
    return { id: user.id, username: user.username };
}

export async function deleteUserAction(id: string) {
  const session = await getSessionFromServer();
  if (!session || !canWrite(session, 'users')) throw new Error("Forbidden");

  const deletedUser = await prisma.user.delete({ where: { id } });

  await logAuditAction({
    userId: session.userId,
    action: 'DELETE_USER',
    resource: 'users',
    details: { deletedUserId: deletedUser.id, username: deletedUser.username }
  });

  revalidatePath("/settings");
  return { success: true };
}
