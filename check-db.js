const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- 1. Checking Users ---');
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: { select: { name: true } } }
    });
    console.log('Users found:', JSON.stringify(users, null, 2));

    console.log('--- 2. Checking Recent Audit Logs ---');
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log('Recent Audit Logs:', JSON.stringify(logs, null, 2));

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
