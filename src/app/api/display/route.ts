import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-utils';
import { Doctor } from '@/lib/data-service'; // Only using for type if needed
import { revalidatePath } from 'next/cache';

// Enable Time-based Revalidation (Vercel Edge Cache) for 10 seconds.
// TV polling setiap 3s hanya akan mengenai DB 1 kali per 10 detik.
export const dynamic = 'force-dynamic';

export async function GET() {
    const allDoctors = await prisma.doctor.findMany({
        orderBy: [
            { specialty: 'asc' },
            { name: 'asc' }
        ]
    });
    const shifts = await prisma.shift.findMany();

    const now = new Date();
    const wibNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const jsDay = wibNow.getUTCDay();
    const todayIdx = (jsDay + 6) % 7;
    const todayStr = wibNow.toISOString().slice(0, 10); // YYYY-MM-DD (WIB)

    const doctors = allDoctors.map((doc: any) => {
        const todayShifts = (shifts as any[]).filter(s => s.doctorId === doc.id && s.dayIdx === todayIdx);
        const shiftPills = todayShifts.map(s => ({
            time: s.formattedTime || '',
            disabled: s.disabledDates.includes(todayStr),
            registrationTime: s.registrationTime || ''
        }));
        const activeShift = todayShifts.find(s => !s.disabledDates.includes(todayStr));

        return {
            ...doc,
            lastManualOverride: doc.lastManualOverride ? Number(doc.lastManualOverride) : undefined,
            shiftPills,
            currentRegistrationTime: activeShift?.registrationTime || doc.registrationTime
        };
    });

    const allSettings = await prisma.settings.findMany();
    let settings = allSettings.length > 0 ? allSettings[0] : {
        id: "1",
        automationEnabled: false,
        runTextMessage: "Selamat Datang di RSU Siaga Medika",
        emergencyMode: false,
        customMessages: [] as any
    };

    if (!settings.customMessages || (settings.customMessages as any[]).length === 0) {
        settings.customMessages = [
            { title: 'Info', text: 'Terimakasih sudah menunggu 🙏' },
            { title: 'Info', text: 'Terimakasih sudah tertib 🌟' },
            { title: 'Antrian', text: 'Belum online? Yo ambil antrian 🎫' },
            { title: 'Info', text: 'Terimakasih sudah mengantri 😊' }
        ];

        // Ensure settings exist in DB with default if missing
        const existing = await (prisma.settings as any).findUnique({ where: { id: "1" } });
        if (existing) {
            await (prisma.settings as any).update({
                where: { id: "1" },
                data: { customMessages: settings.customMessages }
            });
        } else {
            await (prisma.settings as any).create({
                data: {
                    id: "1",
                    automationEnabled: settings.automationEnabled,
                    runTextMessage: settings.runTextMessage,
                    emergencyMode: settings.emergencyMode,
                    customMessages: settings.customMessages
                }
            });
        }
    }

    return NextResponse.json({
        doctors,
        settings: { ...settings, id: String(settings.id) }
    }, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function POST(req: Request) {
    try {
        const authErr = await requirePermission(req, 'display-control', 'write');
        if (authErr) return authErr;

        const body = await req.json();

        // Used by Display Control Page to force save state
        if (body.doctors) {
            const currentDocs = await prisma.doctor.findMany();
            const incomingDocs = body.doctors as typeof currentDocs;
            const incomingIds = new Set(incomingDocs.map(d => d.id));

            for (const inc of incomingDocs) {
                const dataToSave = { ...inc };

                const exists = currentDocs.find((d: any) => d.id === inc.id);
                if (exists) {
                    await (prisma.doctor as any).update({ where: { id: inc.id }, data: dataToSave });
                } else {
                    await (prisma.doctor as any).create({ data: dataToSave });
                }
            }

            for (const doc of currentDocs) {
                if (!incomingIds.has(doc.id as string)) {
                    await (prisma.doctor as any).delete({ where: { id: doc.id } });
                }
            }
        }

        if (body.settings) {
            const currentSettings = await (prisma.settings as any).findMany();
            const existing = currentSettings[0];
            const updates = { ...body.settings };
            delete updates.id;

            if (existing) {
                await (prisma.settings as any).update({ where: { id: existing.id }, data: updates });
            } else {
                await (prisma.settings as any).create({ data: { ...updates, id: "1" } });
            }
        }

        // On-Demand Revalidation: Segera hapus cache 10-detik jika admin/sistem mengubah data via POST
        revalidatePath('/api/display');

        return NextResponse.json({ success: true }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        console.error("Error in POST /api/display", error);
        return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
