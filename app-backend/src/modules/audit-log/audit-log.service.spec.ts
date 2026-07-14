import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService, AuditLogAction } from './audit-log.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      activityLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should create log', async () => {
      prismaMock.activityLog.create.mockResolvedValue({});
      await service.logAction(AuditLogAction.USER_CREATED, 'User', '1', 'admin1', {}, {} as any);
      expect(prismaMock.activityLog.create).toHaveBeenCalled();
    });

    it('should ignore P2002 error', async () => {
      prismaMock.activityLog.create.mockRejectedValue({ code: 'P2002', meta: { target: ['eventId'] } });
      await expect(service.logAction(AuditLogAction.USER_CREATED, 'User', '1', 'admin1', {}, {} as any, 'e1')).resolves.not.toThrow();
    });
    
    it('should catch generic errors without throwing', async () => {
      prismaMock.activityLog.create.mockRejectedValue(new Error('Generic error'));
      await expect(service.logAction(AuditLogAction.USER_CREATED, 'User', '1', 'admin1', {}, {} as any)).resolves.not.toThrow();
    });
  });

  describe('log', () => {
    it('should create log', async () => {
      prismaMock.activityLog.create.mockResolvedValue({ id: '1' });
      const result = await service.log({ action: 'TEST', entityType: 'Test', entityId: '1', ipAddress: '127.0.0.1' });
      expect(result.id).toBe('1');
    });

    it('should return null on P2002', async () => {
      prismaMock.activityLog.create.mockRejectedValue({ code: 'P2002', meta: { target: ['eventId'] } });
      const result = await service.log({ action: 'TEST', entityType: 'Test', entityId: '1', eventId: 'e1', ipAddress: '127.0.0.1' });
      expect(result).toBeNull();
    });

    it('should throw on other errors', async () => {
      prismaMock.activityLog.create.mockRejectedValue(new Error('other error'));
      await expect(service.log({ action: 'TEST', entityType: 'Test', entityId: '1', ipAddress: '127.0.0.1' })).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should find all with filters', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);
      prismaMock.activityLog.count.mockResolvedValue(0);
      
      const result = await service.findAll({ userId: '1', action: 'TEST', entityType: 'Test', entityId: '1', dateFrom: '2023-01-01', dateTo: '2023-01-31' });
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
