import "dotenv/config";
import { PrismaClient, RoleName, PriorityLevel, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Menjalankan proses Seeding Demo...');

  // 1. Roles & Priorities (Ensure they exist)
  for (const role of Object.values(RoleName)) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: `${role} role` },
    });
  }

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
      create: { name: p.name, slaResponseMinutes: p.response, slaResolutionMinutes: p.resolution },
    });
  }

  const roles = await prisma.role.findMany();
  const priorities = await prisma.ticketPriority.findMany();
  const getRole = (name: RoleName) => roles.find((r) => r.name === name)!.id;
  const getPriority = (name: PriorityLevel) => priorities.find((p) => p.name === name)!.id;

  // 2. Departments
  const deptData = [
    { name: 'Information Technology', code: 'IT' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Marketing', code: 'MKT' },
  ];
  
  const depts: Record<string, string> = {};
  for (const d of deptData) {
    const created = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { name: d.name, code: d.code },
    });
    depts[d.code] = created.id;
  }

  // 3. Ticket Categories
  const categoryData = [
    { name: 'Hardware', code: 'IT' },
    { name: 'Software', code: 'IT' },
    { name: 'Network', code: 'IT' },
    { name: 'Account Access', code: 'HR' },
    { name: 'Email', code: 'IT' }
  ];
  const cats: Record<string, string> = {};
  for (const c of categoryData) {
    let catId = (await prisma.ticketCategory.findFirst({ where: { name: c.name } }))?.id;
    if (!catId) {
      const newCat = await prisma.ticketCategory.create({
        data: { name: c.name, description: `Kategori ${c.name}`, departmentId: depts[c.code] }
      });
      catId = newCat.id;
    }
    cats[c.name] = catId;
  }

  // 4. Users
  const hashes = {
    admin: await bcrypt.hash('Admin@123', 10),
    super: await bcrypt.hash('Super@123', 10),
    tech: await bcrypt.hash('Tech@123', 10),
    user: await bcrypt.hash('User@123', 10),
  };

  const usersToCreate = [
    { email: 'admin@helpdeskpro.id', name: 'Super Admin', pass: hashes.admin, role: RoleName.ADMINISTRATOR, dept: depts['IT'] },
    { email: 'supervisor@helpdeskpro.id', name: 'IT Supervisor', pass: hashes.super, role: RoleName.SUPERVISOR, dept: depts['IT'] },
    { email: 'teknisi1@helpdeskpro.id', name: 'Budi Teknisi', pass: hashes.tech, role: RoleName.TECHNICIAN, dept: depts['IT'] },
    { email: 'teknisi2@helpdeskpro.id', name: 'Andi Teknisi', pass: hashes.tech, role: RoleName.TECHNICIAN, dept: depts['IT'] },
    { email: 'karyawan1@helpdeskpro.id', name: 'Rina Marketing', pass: hashes.user, role: RoleName.EMPLOYEE, dept: depts['MKT'] },
    { email: 'karyawan2@helpdeskpro.id', name: 'Sari Finance', pass: hashes.user, role: RoleName.EMPLOYEE, dept: depts['FIN'] },
  ];

  const dbUsers: Record<string, string> = {};
  for (const u of usersToCreate) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: u.pass },
      create: { name: u.name, email: u.email, passwordHash: u.pass, roleId: getRole(u.role), departmentId: u.dept }
    });
    dbUsers[u.email] = created.id;
  }

  // 5. Tickets
  // Clear old demo tickets if any (for idempotency)
  await prisma.rating.deleteMany({});
  await prisma.ticketComment.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.ticketHistory.deleteMany({});
  await prisma.ticket.deleteMany({});

  const now = new Date();
  let ticketCounter = 1;

  const createTicket = async (status: TicketStatus, title: string, isOverdue = false, withRating = false) => {
    const num = `TICK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(ticketCounter++).padStart(4, '0')}`;
    const pastDate = new Date(now.getTime() - (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000); // 1-8 days ago
    
    let slaDueAt = new Date(pastDate.getTime() + 480 * 60000); // LOW default (8 hours)
    if (isOverdue) slaDueAt = new Date(now.getTime() - 60 * 60000); // 1 hr overdue

    const t = await prisma.ticket.create({
      data: {
        ticketNumber: num,
        title,
        description: `Deskripsi permasalahan untuk tiket ${num}:\nUser melaporkan kendala terkait ${title}. Mohon segera ditindaklanjuti.`,
        categoryId: Object.values(cats)[Math.floor(Math.random() * Object.values(cats).length)],
        priorityId: getPriority(isOverdue ? PriorityLevel.HIGH : PriorityLevel.LOW),
        status,
        createdById: dbUsers['karyawan1@helpdeskpro.id'],
        createdAt: pastDate,
        slaDueAt: slaDueAt,
        isOverdue,
        resolvedAt: (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) ? new Date(now.getTime() - 120 * 60000) : null,
        closedAt: status === TicketStatus.CLOSED ? new Date(now.getTime() - 60 * 60000) : null,
      }
    });

    // Histories
    await prisma.ticketHistory.create({
      data: { ticketId: t.id, toStatus: TicketStatus.OPEN, changedById: dbUsers['karyawan1@helpdeskpro.id'], createdAt: pastDate }
    });

    if (status !== TicketStatus.OPEN && status !== TicketStatus.REJECTED && status !== TicketStatus.CANCELLED) {
      const techId = dbUsers[`teknisi${Math.random() > 0.5 ? '1' : '2'}@helpdeskpro.id`];
      await prisma.assignment.create({
        data: { ticketId: t.id, technicianId: techId, assignedById: dbUsers['supervisor@helpdeskpro.id'] }
      });
      await prisma.ticketHistory.create({
        data: { ticketId: t.id, fromStatus: TicketStatus.OPEN, toStatus: TicketStatus.ASSIGNED, changedById: dbUsers['supervisor@helpdeskpro.id'] }
      });

      if (status === TicketStatus.IN_PROGRESS || status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
        await prisma.ticketHistory.create({
          data: { ticketId: t.id, fromStatus: TicketStatus.ASSIGNED, toStatus: TicketStatus.IN_PROGRESS, changedById: techId }
        });
        await prisma.ticketComment.create({
          data: { ticketId: t.id, userId: techId, content: 'Sedang dilakukan pengecekan.', isInternal: true }
        });
      }

      if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
        await prisma.ticketHistory.create({
          data: { ticketId: t.id, fromStatus: TicketStatus.IN_PROGRESS, toStatus: TicketStatus.RESOLVED, changedById: techId }
        });
        await prisma.ticketComment.create({
          data: { ticketId: t.id, userId: techId, content: 'Masalah telah diselesaikan. Silakan verifikasi.', isInternal: false }
        });
      }

      if (status === TicketStatus.CLOSED) {
        await prisma.ticketHistory.create({
          data: { ticketId: t.id, fromStatus: TicketStatus.RESOLVED, toStatus: TicketStatus.CLOSED, changedById: dbUsers['karyawan1@helpdeskpro.id'] }
        });
        if (withRating) {
          await prisma.rating.create({
            data: { ticketId: t.id, ratedById: dbUsers['karyawan1@helpdeskpro.id'], score: Math.floor(Math.random() * 2) + 4, feedback: 'Terima kasih, pelayanan cepat.' }
          });
        }
      }
    }
  };

  console.log('Membangun tiket-tiket demo...');
  for (let i = 0; i < 5; i++) await createTicket(TicketStatus.OPEN, `Permintaan Akses ${i+1}`);
  for (let i = 0; i < 3; i++) await createTicket(TicketStatus.ASSIGNED, `Error Aplikasi ${i+1}`);
  for (let i = 0; i < 4; i++) await createTicket(TicketStatus.IN_PROGRESS, `Instalasi Software ${i+1}`);
  for (let i = 0; i < 3; i++) await createTicket(TicketStatus.RESOLVED, `Jaringan Putus ${i+1}`);
  for (let i = 0; i < 10; i++) await createTicket(TicketStatus.CLOSED, `Permintaan Email Baru ${i+1}`, false, true);
  for (let i = 0; i < 2; i++) await createTicket(TicketStatus.REJECTED, `Permintaan Beli Laptop ${i+1}`);
  for (let i = 0; i < 2; i++) await createTicket(TicketStatus.IN_PROGRESS, `Server Down ${i+1}`, true);

  console.log('✅ Seeding selesai! Database siap digunakan untuk presentasi.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
