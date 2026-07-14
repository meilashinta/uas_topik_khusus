import { Test, TestingModule } from '@nestjs/testing';
import { PrioritiesService } from './priorities.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConflictException } from '@nestjs/common';
import { PriorityLevel } from '@prisma/client';

describe('PrioritiesService', () => {
  let service: PrioritiesService;
  let prismaMock: any;
  let auditLogMock: any;

  beforeEach(async () => {
    prismaMock = {
      ticketPriority: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    auditLogMock = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrioritiesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
      ],
    }).compile();

    service = module.get<PrioritiesService>(PrioritiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all priorities', async () => {
      prismaMock.ticketPriority.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should return priority if found', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: '1' });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });
  });

  describe('create', () => {
    it('should throw ConflictException if name already exists', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: '1', name: PriorityLevel.CRITICAL });
      await expect(service.create({ name: PriorityLevel.CRITICAL, slaResponseMinutes: 30, slaResolutionMinutes: 240 }, 'admin1', {}))
        .rejects.toThrow(ConflictException);
    });

    it('should create priority successfully', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue(null);
      prismaMock.ticketPriority.create.mockResolvedValue({ id: '1', name: PriorityLevel.CRITICAL });
      
      const result = await service.create({ name: PriorityLevel.CRITICAL, slaResponseMinutes: 30, slaResolutionMinutes: 240 }, 'admin1', {});
      expect(result.id).toBe('1');
      expect(auditLogMock.logAction).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue(null);
      await expect(service.update('p1', {}, 'admin1', {})).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should update SLA times successfully', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: 'p1', name: PriorityLevel.HIGH });
      prismaMock.ticketPriority.update.mockResolvedValue({ id: 'p1', slaResponseMinutes: 10 });

      const result = await service.update('p1', { slaResponseMinutes: 10 }, 'admin1', {});

      expect(prismaMock.ticketPriority.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { slaResponseMinutes: 10 },
      });
      expect(result.slaResponseMinutes).toBe(10);
      expect(auditLogMock.logAction).toHaveBeenCalledWith(
        'PRIORITY_UPDATED', 'TicketPriority', 'p1', 'admin1', expect.any(Object), expect.any(Object)
      );
    });
  });

  describe('softDelete', () => {
    it('should throw NotFoundException if not found', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue(null);
      await expect(service.softDelete('p1', 'admin1', {})).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });

    it('should throw BadRequestException if already deactivated', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: 'p1', isActive: false });
      await expect(service.softDelete('p1', 'admin1', {})).rejects.toThrow(require('@nestjs/common').BadRequestException);
    });

    it('should deactivate priority', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: 'p1', isActive: true, _count: { tickets: 0 } });
      prismaMock.ticketPriority.update.mockResolvedValue({ id: 'p1', isActive: false });
      
      await service.softDelete('p1', 'admin1', {});
      
      expect(prismaMock.ticketPriority.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isActive: false },
      });
      expect(auditLogMock.logAction).toHaveBeenCalled();
    });
  });
});
