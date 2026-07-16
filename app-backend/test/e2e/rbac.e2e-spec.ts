import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('RBAC Validation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let employeeToken: string;
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
    const tech = await createTestUser(prisma, RoleName.TECHNICIAN, 'technician@test.com');
    techId = tech.id;
    
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = empLogin.body.data.accessToken;

    const techLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'technician@test.com', password: 'password123' });
    technicianToken = techLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Employee accesses admin endpoint -> 403', async () => {
    // Assuming departments creation is Admin-only
    await request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ name: 'Finance' })
      .expect(403);
  });

  it('Employee tries to assign technician -> 403', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Bug Issue', description: 'Bug in app', categoryId: category?.id, priorityId: priority?.id });
      
    if (!res.body.success) console.log('CREATE TICKET FAILED:', res.body);
      
    const ticketId = res.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ technicianId: techId })
      .expect(403);
  });

  it('Technician tries to reject ticket -> 403', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Bug Issue', description: 'Bug in app', categoryId: category?.id, priorityId: priority?.id });
      
    const ticketId = res.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/reject`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ reason: 'No' })
      .expect(403);
  });

  it('Technician accesses unassigned ticket -> 403', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    // Employee creates ticket A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Ticket A', description: 'Description', categoryId: category?.id, priorityId: priority?.id });
    
    // Tech tries to change status of unassigned ticket A
    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${resA.body.data.id}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(422);
  });
});
