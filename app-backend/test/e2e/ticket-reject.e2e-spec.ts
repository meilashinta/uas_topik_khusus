import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Ticket Reject Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let employeeToken: string;
  let supervisorToken: string;

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
    
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = empLogin.body.data.accessToken;

    const spvLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'supervisor@test.com', password: 'password123' });
    supervisorToken = spvLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Supervisor rejects ticket and halts further processing', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    // 1. Employee creates ticket
    let res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Spam email',
        description: 'Getting lots of spam',
        categoryId: category?.id,
        priorityId: priority?.id,
      })
      .expect(201);
    
    const ticketId = res.body.data.id;

    // 2. Supervisor rejects ticket
    res = await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/reject`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ reason: 'Not an IT issue' })
      .expect(200);

    expect(res.body.data.status).toBe('REJECTED');

    // 3. Verify further transitions are blocked (e.g. assigning is rejected)
    const tech = await createTestUser(prisma, RoleName.TECHNICIAN, 'tech@test.com');
    await request(app.getHttpServer())
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ technicianId: tech.id })
      .expect(422); // Unprocessable Entity / Invalid State Transition
      
    // Verify DB
    const ticketInDb = await prisma.ticket.findUnique({ where: { id: ticketId }});
    expect(ticketInDb?.status).toBe('REJECTED');
  });
});
