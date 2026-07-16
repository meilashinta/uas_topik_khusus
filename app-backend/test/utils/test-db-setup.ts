import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function clearDatabase(prisma: PrismaService) {
  // Delete in reverse order of dependencies
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.passwordHistory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.ticketPriority.deleteMany();
  await prisma.department.deleteMany();
  await prisma.role.deleteMany();
}

export async function seedBaseData(prisma: PrismaService) {
  // Roles
  const roles = [
    { name: RoleName.EMPLOYEE, description: 'Standard User' },
    { name: RoleName.TECHNICIAN, description: 'IT Support' },
    { name: RoleName.SUPERVISOR, description: 'IT Manager' },
    { name: RoleName.ADMINISTRATOR, description: 'System Admin' },
  ];

  for (const role of roles) {
    await prisma.role.create({ data: role });
  }

  // Departments
  await prisma.department.create({
    data: { name: 'IT Department', code: 'IT' },
  });
  await prisma.department.create({
    data: { name: 'HR Department', code: 'HR' },
  });

  // Priorities
  await prisma.ticketPriority.create({
    data: { name: 'HIGH', slaResponseMinutes: 60, slaResolutionMinutes: 1440 },
  });
  await prisma.ticketPriority.create({
    data: { name: 'MEDIUM', slaResponseMinutes: 240, slaResolutionMinutes: 4320 },
  });

  // Categories
  await prisma.ticketCategory.create({
    data: { name: 'Hardware', description: 'Hardware issues' },
  });
  await prisma.ticketCategory.create({
    data: { name: 'Software', description: 'Software issues' },
  });
}

export async function createTestUser(prisma: PrismaService, roleName: RoleName, email: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  const department = await prisma.department.findFirst();
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  return prisma.user.create({
    data: {
      name: `Test ${roleName}`,
      email,
      passwordHash: hashedPassword,
      roleId: role!.id,
      departmentId: department!.id,
      isActive: true,
    },
  });
}
