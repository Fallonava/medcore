/**
 * data-service.ts
 *
 * IMPORTANT: The JSONStore flat-file stores have been REMOVED.
 * All data is now served from the Neon PostgreSQL database via Prisma.
 *
 * This file is kept to export shared TypeScript types used across the app.
 * Do NOT re-add JSONStore instances here.
 */

// --- Schedule Types ---
export interface Shift {
    id: string;
    dayIdx: number;
    timeIdx: number;
    title: string;
    doctorId: string;
    doctor?: string;       // name mapped for UI simplicity
    doctorRel?: Doctor;    // Optional populated relation
    color: string;
    formattedTime?: string;
    registrationTime?: string;
    extra?: string;
    disabledDates?: string[];
    statusOverride?: Doctor['status'] | null;
}

export interface LeaveRequest {
    id: string;
    doctorId: string;
    doctor?: string;
    doctorRel?: Doctor;
    specialty?: string;
    type: 'Sakit' | 'Liburan' | 'Pribadi' | 'Konferensi' | 'Lainnya';
    startDate: Date;
    endDate: Date;
    reason?: string;
    status: string;
    avatar?: string;
}

// --- Doctor Types ---
export interface Doctor {
    id: string;
    name: string;
    specialty: string;
    status: 'BUKA' | 'PENUH' | 'OPERASI' | 'CUTI' | 'SELESAI' | 'AKAN_BUKA' | 'TIDAK PRAKTEK' | 'TIDAK_PRAKTEK';
    image?: string;
    category: 'Bedah' | 'NonBedah';
    startTime: string;   // e.g., "08:00"
    endTime: string;     // e.g., "14:00"
    queueCode: string;   // e.g., "A-01" or "BP"
    lastCall?: string;
    registrationTime?: string;
    lastManualOverride?: number; // Timestamp of last manual status change
}

// --- Automation / Settings Types ---
export interface BroadcastRule {
    id: string;
    message: string;
    alertLevel: 'Information' | 'Warning' | 'Critical';
    targetZone: 'All Zones' | 'Lobby Only' | 'ER & Wards';
    duration: number; // minutes
    active: boolean;
}

export interface Settings {
    id: string;
    automationEnabled: boolean;
    runTextMessage?: string;
    emergencyMode?: boolean;
    customMessages?: { title: string; text: string }[];
}
