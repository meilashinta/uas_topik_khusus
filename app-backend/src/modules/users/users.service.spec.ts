import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { EmailService } from '../email/email.service';
import { AuditLogService, AuditLogAction } from '../audit-log/audit-log.service';
import { ConflictException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: any;
  let redisMock: any;
  let emailMock: any;
  let auditLogMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
    };
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    emailMock = {
      sendResetPasswordEmail: jest.fn(),
    };
    auditLogMock = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
        { provide: EmailService, useValue: emailMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw error if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });
      await expect(service.create({ 
        name: 'Test', email: 'test@example.com', password: 'pw', roleId: 'r1', departmentId: 'd1' 
      }, 'admin1', {})).rejects.toThrow(ConflictException);
    });

    it('should successfully create user and log action', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.role.findUnique.mockResolvedValue({ id: 'r1', name: 'EMPLOYEE' });
      prismaMock.department.findUnique.mockResolvedValue({ id: 'd1', isActive: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPw');

      const mockNewUser = { id: 'u1', email: 'new@test.com', role: { id: 'r1' }, department: { id: 'd1' } };
      prismaMock.user.create.mockResolvedValue(mockNewUser);

      const result = await service.create({
        name: 'New', email: 'new@test.com', password: 'pw', roleId: 'r1', departmentId: 'd1'
      }, 'admin1', {});

      expect(result).toEqual(mockNewUser);
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        AuditLogAction.USER_CREATED, 'User', 'u1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });

  describe('update', () => {
    it('should correctly trigger USER_ROLE_CHANGED audit if roleId is updated', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', roleId: 'oldRole' });
      prismaMock.role.findUnique.mockResolvedValue({ id: 'newRole' });
      prismaMock.user.update.mockResolvedValue({ id: 'u1' });

      await service.update('u1', { roleId: 'newRole' }, 'admin1', {});

      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        AuditLogAction.USER_ROLE_CHANGED, 'User', 'u1', 'admin1', expect.any(Object), expect.any(Object)
      );
      expect(redisMock.del).toHaveBeenCalledWith('user:u1');
    });
  });

  describe('softDelete', () => {
    it('should block admin from deleting themselves', async () => {
      await expect(service.softDelete('admin1', 'admin1', {}))
        .rejects.toThrow(ForbiddenException);
    });

    it('should set isActive to false and log action', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', isActive: true });
      prismaMock.user.update.mockResolvedValue({ id: 'u1', email: 'u1@test.com' });

      const result = await service.softDelete('u1', 'admin1', {});

      expect(result.message).toBe('User successfully deactivated');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isActive: false },
        select: { id: true, email: true },
      });
      expect(redisMock.del).toHaveBeenCalledWith('user:u1');
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        AuditLogAction.USER_DEACTIVATED, 'User', 'u1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });
});
