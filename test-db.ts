import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient();
async function main() {
    console.log('--- EYE CLINIC INVESTIGATION ---');
    const today = new Date();
    const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
    console.log(`Today is DayIdx: ${todayDayIdx} (Tue=1)`);

    const doctors = await prisma.doctor.findMany({
        where: { specialty: { contains: 'Mata', mode: 'insensitive' } },
        include: { shifts: true }
    });

    doctors.forEach(d => {
        console.log(`\nDoctor: ${d.name} (${d.specialty})`);
        console.log(`Current Status: ${d.status}`);
        console.log(`Shifts today:`, JSON.stringify(d.shifts.filter(s => s.dayIdx === todayDayIdx), null, 2));
    });

    console.log('\n--- ACTIVE AUTOMATION RULES ---');
    const rules = await prisma.automationRule.findMany({ where: { active: true } });
    console.log(JSON.stringify(rules, null, 2));

    console.log('--- END INVESTIGATION ---');
}
main().catch(console.error).finally(() => prisma.$disconnect());
