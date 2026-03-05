const { PrismaClient } = require('@prisma/client');

async function check() {
  console.log('--- Database Check ---');
  const prisma = new PrismaClient();
  try {
    console.log('Connecting...');
    await prisma.$connect();
    console.log('✅ Connected.');

    const doctorsCount = await prisma.doctor.count();
    const shiftsCount = await prisma.shift.count();
    const settings = await prisma.settings.findFirst();

    console.log(`Doctors: ${doctorsCount}`);
    console.log(`Shifts: ${shiftsCount}`);
    console.log(`Settings: ${settings ? 'Found' : 'Missing'}`);

    if (doctorsCount === 0) {
      console.log('⚠️ Warning: No doctors found in database.');
    }

  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
