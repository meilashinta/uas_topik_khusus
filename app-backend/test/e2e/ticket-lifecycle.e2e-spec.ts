import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Ticket Lifecycle (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let employeeToken: string;
  let supervisorToken: string;
  let technicianToken: string;
  
  let empId: string;
  let spvId: string;
  let techId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useLogger(false);
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    await seedBaseData(prisma);
    
    const emp = await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
    const spv = await createTestUser(prisma, RoleName.SUPERVISOR, 'supervisor@test.com');
    const tech = await createTestUser(prisma, RoleName.TECHNICIAN, 'technician@test.com');
    
    empId = emp.id;
    spvId = spv.id;
    techId = tech.id;

    // Login users
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = empLogin.body.data.accessToken;

    const spvLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'supervisor@test.com', password: 'password123' });
    supervisorToken = spvLogin.body.data.accessToken;

    const techLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'technician@test.com', password: 'password123' });
    technicianToken = techLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('UC-01 to UC-04: Full Ticket Lifecycle', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    // 1. Employee creates a ticket
    let res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Cannot access email',
        description: 'My outlook is not opening',
        categoryId: category?.id,
        priorityId: priority?.id,
      })
      .expect(201);
    
    expect(res.body.success).toBe(true);
    const ticketId = res.body.data.id;
    expect(res.body.data.status).toBe('OPEN');

    // 2. Supervisor views OPEN tickets
    res = await request(app.getHttpServer())
      .get('/api/v1/tickets?status=OPEN')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .expect(200);
    
    expect(res.body.data.data.length).toBeGreaterThan(0);

    // 3. Supervisor assigns technician
    res = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ technicianId: techId })
      .expect(201);
    
    expect(res.body.data.status).toBe('ASSIGNED');

    // 4. Technician views their assigned tickets
    res = await request(app.getHttpServer())
      .get(`/api/v1/tickets?technicianId=${techId}`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);
    
    expect(res.body.data.data.some((t: any) => t.id === ticketId)).toBe(true);

    // 5. Technician updates status to IN_PROGRESS
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    expect(res.body.data.status).toBe('IN_PROGRESS');

    // 6. Technician adds internal comment
    res = await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        content: 'Checking the exchange server connection',
        isInternal: true,
      })
      .expect(201);

    // 7. Technician resolves the ticket
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'RESOLVED', note: 'Reconfigured Outlook profile' })
      .expect(200);

    expect(res.body.data.status).toBe('RESOLVED');

    // 8. Employee approves (closes) the ticket and gives rating
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/close`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ rating: 5, feedback: 'Thanks! It works now.' })
      .expect(200);
      
    expect(res.body.data.status).toBe('CLOSED');
    

    // 9. Verifications
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { histories: true, rating: true, comments: true },
    });

    expect(finalTicket?.status).toBe('CLOSED');
    expect(finalTicket?.rating?.score).toBe(5);
    expect(finalTicket?.comments.length).toBe(1);
    
    // Check ticket history transitions
    const historyStatuses = finalTicket?.histories.map(h => h.toStatus);
    expect(historyStatuses).toEqual(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
  });
});
