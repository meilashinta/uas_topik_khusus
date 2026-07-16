import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Ticket Reopen Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let employeeToken: string;
  let supervisorToken: string;
  let technicianToken: string;
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
    
    await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
    await createTestUser(prisma, RoleName.SUPERVISOR, 'supervisor@test.com');
    const tech = await createTestUser(prisma, RoleName.TECHNICIAN, 'technician@test.com');
    techId = tech.id;
    
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

  it('Employee reopens a resolved ticket', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    // Setup: Create -> Assign -> InProgress -> Resolved
    let res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Bug Issue', description: 'Bug in app', categoryId: category?.id, priorityId: priority?.id });
    const ticketId = res.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ technicianId: techId });

    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'IN_PROGRESS' });

    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'RESOLVED', note: 'Fixed' });

    // Test: Employee reopens
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/reopen`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ reason: 'The bug is still happening' })
      .expect(200);

    expect(res.body.data.status).toBe('IN_PROGRESS');

    // Test: Tech resolves again
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'RESOLVED', note: 'Actually fixed this time' })
      .expect(200);

    expect(res.body.data.status).toBe('RESOLVED');

    // Test: Employee closes
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/close`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ rating: 5, feedback: 'Confirmed fixed' })
      .expect(200);

    expect(res.body.data.status).toBe('CLOSED');
  });
});
