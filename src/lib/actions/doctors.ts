"use server";

import { prisma } from "@/lib/prisma";
import { getSessionFromServer, canWrite } from "@/lib/auth";
import { notifyDoctorUpdates } from "@/lib/automation-broadcaster";
import { logAuditAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getDoctorsAction() {
    const doctors = await prisma.doctor.findMany({
        orderBy: [
            { specialty: 'asc' },
            { name: 'asc' }
        ]
    });
    
    return doctors.map(doc => ({
        ...doc,
        lastManualOverride: doc.lastManualOverride ? Number(doc.lastManualOverride) : undefined
    }));
}

export async function updateDoctorAction(id: string, data: any) {
    const session = await getSessionFromServer();
    
    if (!session || !canWrite(session, 'doctors')) {
        throw new Error("Unauthorized: Anda tidak memiliki izin untuk mengubah data dokter.");
    }
    
    const updated = await prisma.doctor.update({
        where: { id },
        data
    });

    // Notify realtime listeners (SSE)
    notifyDoctorUpdates([{ id: String(updated.id) }]);
    
    // Log audit
    await logAuditAction({
        userId: session.userId,
        action: 'UPDATE_DOCTOR',
        resource: 'doctors',
        details: { doctorId: id, name: updated.name, fields: Object.keys(data) }
    });

    revalidatePath("/doctors");
    return updated;
}

export async function deleteDoctorAction(id: string) {
    const session = await getSessionFromServer();
    
    if (!session || !canWrite(session, 'doctors')) {
        throw new Error("Unauthorized");
    }

    const deleted = await prisma.doctor.delete({
        where: { id }
    });

    notifyDoctorUpdates([{ id: String(id) }]);
    
    await logAuditAction({
        userId: session.userId,
        action: 'DELETE_DOCTOR',
        resource: 'doctors',
        details: { doctorId: id, name: deleted.name }
    });

    revalidatePath("/doctors");
    return { success: true };
}
