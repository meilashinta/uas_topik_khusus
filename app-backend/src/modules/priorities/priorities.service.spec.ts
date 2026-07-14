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

  describe('create', () => {
    it('should throw ConflictException if name already exists', async () => {
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: '1', name: PriorityLevel.CRITICAL });
      await expect(service.create({ name: PriorityLevel.CRITICAL, slaResponseMinutes: 30, slaResolutionMinutes: 240 }, 'admin1', {}))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
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
});
