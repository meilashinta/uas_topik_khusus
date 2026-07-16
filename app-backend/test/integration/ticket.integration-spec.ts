import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Ticket Module (Integration)', () => {
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
    
    // Create users
    await createTestUser(prisma, RoleName.EMPLOYEE, 'emp@test.com');
    await createTestUser(prisma, RoleName.SUPERVISOR, 'spv@test.com');
    
    // Get tokens
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'emp@test.com', password: 'password123' });
    employeeToken = empLogin.body.data.accessToken;

    const spvLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'spv@test.com', password: 'password123' });
    supervisorToken = spvLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tickets', () => {
    it('should create a new ticket and history record', async () => {
      const category = await prisma.ticketCategory.findFirst();
      const priority = await prisma.ticketPriority.findFirst();

      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Test Ticket',
          description: 'This is a test ticket',
          categoryId: category?.id,
          priorityId: priority?.id,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const ticketId = response.body.data.id;

      // Verify DB
      const ticketInDb = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { histories: true },
      });
      
      expect(ticketInDb).toBeDefined();
      expect(ticketInDb?.status).toBe('OPEN');
      expect(ticketInDb?.histories.length).toBe(1);
      expect(ticketInDb?.histories[0].toStatus).toBe('OPEN');
    });
  });

  describe('POST /api/v1/tickets/:id/assign', () => {
    it('should assign a ticket and update status', async () => {
      // Setup: Create ticket
      const category = await prisma.ticketCategory.findFirst();
      const priority = await prisma.ticketPriority.findFirst();
      
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Test Ticket',
          description: 'This is a test ticket',
          categoryId: category?.id,
          priorityId: priority?.id,
        });
      
      const ticketId = createRes.body.data.id;

      // Setup: Create tech
      const tech = await createTestUser(prisma, RoleName.TECHNICIAN, 'tech@test.com');

      // Action: Assign
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          technicianId: tech.id,
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify DB
      const ticketInDb = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { assignments: true, histories: true },
      });
      
      expect(ticketInDb?.status).toBe('ASSIGNED');
      expect(ticketInDb?.assignments.length).toBe(1);
      expect(ticketInDb?.assignments[0].technicianId).toBe(tech.id);
      
      // History should have 2 records: OPEN, then ASSIGNED
      expect(ticketInDb?.histories.length).toBe(2);
    });
  });
});
