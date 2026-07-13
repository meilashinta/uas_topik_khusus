import "dotenv/config";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName, PriorityLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Roles
  for (const role of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: {
        name: role,
        description: `${role} role`,
      },
    });
  }
  console.log('Roles seeded.');

  // 2. Priorities
  const prioritiesData = [
    { name: PriorityLevel.CRITICAL, response: 30, resolution: 240 },
    { name: PriorityLevel.HIGH, response: 60, resolution: 480 },
    { name: PriorityLevel.MEDIUM, response: 240, resolution: 1440 },
    { name: PriorityLevel.LOW, response: 480, resolution: 4320 },
  ];

  for (const p of prioritiesData) {
    await prisma.ticketPriority.upsert({
      where: { name: p.name },
      update: {},
      create: {
        name: p.name,
        slaResponseMinutes: p.response,
        slaResolutionMinutes: p.resolution,
      },
    });
  }
  console.log('Priorities seeded.');

  // 3. Department
  const department = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      name: 'Information Technology',
      code: 'IT',
    },
  });
  console.log('Department seeded.');

  // 4. Admin User
  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMINISTRATOR } });
  if (!adminRole) throw new Error('Admin role not found');

  const adminEmail = 'admin@helpdeskpro.local';
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      departmentId: department.id,
    },
  });
  console.log('Admin user seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
