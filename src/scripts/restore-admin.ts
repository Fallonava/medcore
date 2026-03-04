import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

const RESOURCES = [
  'dashboard', 'schedules', 'doctors', 'leaves', 
  'analytics', 'automation', 'display-control', 'users', 'access'
];

async function main() {
  console.log('--- Restoring Super Admin Access ---');

  // 1. Ensure Super Admin Role exists
  let role = await prisma.role.findUnique({
    where: { name: 'Super Admin' },
    include: { permissions: true }
  });

  if (!role) {
    console.log('Creating "Super Admin" role...');
    role = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Full access to all features',
        isSystem: true,
        permissions: {
          create: RESOURCES.flatMap(r => [
            { resource: r, action: 'read' },
            { resource: r, action: 'write' }
          ])
        }
      },
      include: { permissions: true }
    });
  } else {
    console.log('"Super Admin" role already exists. Ensuring full permissions...');
    // Optional: Update permissions if missing
    for (const r of RESOURCES) {
      for (const a of ['read', 'write']) {
        if (!role.permissions.some(p => p.resource === r && p.action === a)) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              resource: r,
              action: a
            }
          });
        }
      }
    }
  }

  // 2. Create or Update Super Admin User
  const username = 'superadmin';
  const password = 'admin123'; // Temporary password
  const hashedPassword = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: { username }
  });

  if (existingUser) {
    console.log(`User "${username}" already exists. Updating password and role...`);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        roleId: role.id,
        isActive: true
      }
    });
  } else {
    console.log(`Creating new user "${username}"...`);
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: 'Recovered Admin',
        roleId: role.id,
        isActive: true
      }
    });
  }

  console.log('\n--- Success ---');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('Please log in and change your password immediately.');
}

main()
  .catch(e => {
    console.error('Error restoring access:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
