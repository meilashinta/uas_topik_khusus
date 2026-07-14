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
      ticketHistory: {
        groupBy: jest.fn(),
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

  describe('findAll', () => {
    it('should return paginated users based on filter', async () => {
      prismaMock.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prismaMock.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, roleId: 'r1', departmentId: 'd1', search: 'john' });
      
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          roleId: 'r1',
          departmentId: 'd1',
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
        })
      }));
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user not found', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('u1')).rejects.toThrow(NotFoundException);
    });

    it('should return user from redis if cached', async () => {
      redisMock.get.mockResolvedValue(JSON.stringify({ id: 'u1', name: 'cached' }));
      const result = await service.findOne('u1');
      expect(result.name).toBe('cached');
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return user from DB and cache it if not in redis', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', name: 'db' });

      const result = await service.findOne('u1');
      expect(result.name).toBe('db');
      expect(redisMock.set).toHaveBeenCalled();
    });
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

    it('should throw BadRequestException if updating to inactive department', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', roleId: 'r1', departmentId: 'd1' });
      prismaMock.department.findUnique.mockResolvedValue({ isActive: false });
      
      await expect(service.update('u1', { departmentId: 'd2' } as any, 'admin1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should handle department change in update', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', departmentId: 'd1' });
      prismaMock.department.findUnique.mockResolvedValue({ id: 'd2', isActive: true });
      prismaMock.user.update.mockResolvedValue({ id: 'u1' });

      await service.update('u1', { departmentId: 'd2' } as any, 'admin1', {} as any);
      expect(prismaMock.department.findUnique).toHaveBeenCalled();
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

  describe('resetPasswordByAdmin', () => {
    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPasswordByAdmin('u1', 'admin1', {})).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should reset password by admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@example.com' });
      await service.resetPasswordByAdmin('u1', 'admin1', {});

      expect(redisMock.set).toHaveBeenCalled();
      expect(emailMock.sendResetPasswordEmail).toHaveBeenCalled();
      expect(auditLogMock.logAction).toHaveBeenCalled();
    });
  });

  describe('getTechnicianWorkload', () => {
    it('should return mapped technicians workload', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'tech1', name: 'Tech 1', email: 'tech1@example.com', _count: { assignments: 2 } }
      ]);
      prismaMock.ticketHistory.groupBy = jest.fn().mockResolvedValue([
        { changedById: 'tech1', _count: { id: 1 } }
      ]);

      const result = await service.getTechnicianWorkload();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'tech1',
        name: 'Tech 1',
        email: 'tech1@example.com',
        activeTickets: 2,
        resolvedToday: 1
      });
    });
  });

  describe('getTechnicianRatings', () => {
    it('should aggregate ratings correctly', async () => {
      prismaMock.rating = {
        findMany: jest.fn().mockResolvedValue([
          { score: 5, ticket: { assignments: [{ technicianId: 'tech1' }] } },
          { score: 3, ticket: { assignments: [{ technicianId: 'tech1' }] } },
          { score: 0, ticket: { assignments: [{ technicianId: 'tech1' }] } }, // out of range 1-5
          { score: 5, ticket: null } // missing ticket
        ])
      };
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'tech1', name: 'Tech 1', department: { name: 'IT' } }
      ]);

      const result = await service.getTechnicianRatings();
      expect(result).toHaveLength(1);
      expect(result[0].averageScore).toBe((5 + 3 + 0) / 3);
      expect(result[0].totalRatings).toBe(3);
      expect(result[0].distribution[5]).toBe(1);
    });
  });

  describe('updateProfile', () => {
    it('should update profile and invalidate cache', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'u1' });
      await service.updateProfile('u1', { name: 'New Name' });
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalledWith('user:u1');
    });
  });

  describe('updateNotificationPreference', () => {
    it('should throw if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.updateNotificationPreference('u1', true)).rejects.toThrow();
    });

    it('should update pref and invalidate cache', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.user.update.mockResolvedValue({ emailNotificationEnabled: true });
      await service.updateNotificationPreference('u1', true);
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalledWith('user:u1');
    });
  });
});
