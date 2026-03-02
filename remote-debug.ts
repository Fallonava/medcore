import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const doctors = await prisma.doctor.findMany({
        where: { specialty: { contains: 'Mata', mode: 'insensitive' } }
    });

    console.log('RESULT_START');
    doctors.forEach(d => {
        console.log(`DOCTOR_NAME: ${d.name}`);
        console.log(`CURRENT_STATUS: ${d.status}`);
    });
    console.log('RESULT_END');
}

main()
    .catch(err => {
        console.error('ERROR:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
