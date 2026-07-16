import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Input Validation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  let employeeToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Setting transform: true and whitelist: true exactly like main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useLogger(false);
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    await seedBaseData(prisma);
    
    await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
    const empLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'employee@test.com', password: 'password123' });
    employeeToken = empLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Register without email -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        password: 'Password123!',
        name: 'New User',
      })
      .expect(400);
      
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.stringContaining('email')]));
  });

  it('Register weak password -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'newuser@test.com',
        password: '123',
        name: 'New User',
      })
      .expect(400);

    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.stringContaining('password')]));
  });

  it('Create ticket without title -> 400', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        description: 'Missing title',
        categoryId: category?.id,
        priorityId: priority?.id,
      })
      .expect(400);
      
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.stringContaining('title')]));
  });

  it('Illegal status transition -> 422', async () => {
    const category = await prisma.ticketCategory.findFirst();
    const priority = await prisma.ticketPriority.findFirst();

    const res = await request(app.getHttpServer())
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ title: 'Bug Issue', description: 'Bug in app', categoryId: category?.id, priorityId: priority?.id });
      
    const ticketId = res.body.data.id;

    // An OPEN ticket cannot go straight to CLOSED without being RESOLVED first (if employee directly calls close)
    await request(app.getHttpServer())
      .patch(`/api/v1/tickets/${ticketId}/close`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ rating: 5, feedback: 'Closing prematurely' })
      .expect(422);
  });
});
