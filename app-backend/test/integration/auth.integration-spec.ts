import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { RedisService } from '../../src/infrastructure/redis/redis.service';
import { clearDatabase, seedBaseData, createTestUser } from '../utils/test-db-setup';
import { RoleName } from '@prisma/client';

describe('Auth Module (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    // Disable logging for cleaner test output
    app.useLogger(false);
    
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    redis = app.get<RedisService>(RedisService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    await seedBaseData(prisma);
    await redis.getClient().flushdb(); // Clear Redis
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and save to DB', async () => {
      const department = await prisma.department.findFirst();
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'New User',
          departmentId: department?.id,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();

      const userInDb = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      
      expect(userInDb).toBeDefined();
      expect(userInDb?.name).toBe('New User');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens', async () => {
      await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
      
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'employee@test.com',
          password: 'password123',
        })
        .expect(201); // 201 is default for POST in NestJS unless specified

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
      
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'employee@test.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should invalidate refresh token in Redis', async () => {
      await createTestUser(prisma, RoleName.EMPLOYEE, 'employee@test.com');
      
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'employee@test.com', password: 'password123' });
        
      const accessToken = loginRes.body.data.accessToken;
      const refreshToken = loginRes.body.data.refreshToken;

      // Ensure no blacklist key yet
      const keysBefore = await redis.getClient().keys(`blacklist:${refreshToken}`);
      expect(keysBefore.length).toBe(0);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(201);

      // Verify token is added to blacklist in Redis
      const keysAfter = await redis.getClient().keys(`blacklist:${refreshToken}`);
      expect(keysAfter.length).toBe(1);
    });
  });
});
