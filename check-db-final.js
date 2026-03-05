const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually load .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

async function check() {
  console.log('--- Database Check (Manual Env) ---');
  loadEnv();
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    return;
  }

  const prisma = new PrismaClient();
  try {
    console.log('Connecting to DATABASE_URL...');
    await prisma.$connect();
    console.log('✅ Connected.');

    const doctorsCount = await prisma.doctor.count();
    const shiftsCount = await prisma.shift.count();
    const settings = await prisma.settings.findFirst();

    console.log(`Doctors count: ${doctorsCount}`);
    console.log(`Shifts count: ${shiftsCount}`);
    console.log(`Settings: ${settings ? 'Found (automation: ' + settings.automationEnabled + ')' : 'Missing'}`);

    if (doctorsCount > 0) {
      const sample = await prisma.doctor.findFirst();
      console.log(`Sample doctor: ${sample.name} (status: ${sample.status})`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
