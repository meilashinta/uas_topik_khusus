import { Test, TestingModule } from '@nestjs/testing';
import { SlaCronService } from './sla.cron';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RabbitMQService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { SlaService } from './sla.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { TicketStatus } from '@prisma/client';

describe('SlaCronService', () => {
  let service: SlaCronService;
  let prismaService: any;
  let rabbitmqService: any;
  let redisService: any;
  let slaService: any;
  let auditLogService: any;

  beforeEach(async () => {
    prismaService = {
      ticket: {
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
      },
      $transaction: jest.fn((cb) => cb(prismaService)),
      ticketHistory: {
        create: jest.fn(),
      }
    };
    rabbitmqService = { publish: jest.fn() };
    redisService = { get: jest.fn(), set: jest.fn() };
    slaService = {
      isOverdue: jest.fn(),
      isWarning: jest.fn(),
      getRemainingTime: jest.fn(),
      getRemainingPercentage: jest.fn(),
    };
    auditLogService = { logAction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlaCronService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RabbitMQService, useValue: rabbitmqService },
        { provide: RedisService, useValue: redisService },
        { provide: SlaService, useValue: slaService },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<SlaCronService>(SlaCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkSlaCompliance', () => {
    it('should detect SLA breach and publish event', async () => {
      const mockTicket = {
        id: 'ticket-1',
        ticketNumber: 'TKT-1',
        slaDueAt: new Date(),
        priority: { name: 'HIGH', slaResolutionMinutes: 60 },
        assignments: [{ technicianId: 'tech-1' }]
      };
      
      prismaService.ticket.findMany.mockResolvedValueOnce([mockTicket]);
      prismaService.ticket.findMany.mockResolvedValueOnce([]); // for updateSlaCacheMetrics
      
      slaService.isOverdue.mockReturnValue(true);
      slaService.getRemainingTime.mockReturnValue(-15);

      await service.checkSlaCompliance();

      expect(prismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { isOverdue: true }
      });
      expect(rabbitmqService.publish).toHaveBeenCalledWith('sla.events', 'sla.breach', expect.objectContaining({
        eventType: 'SlaBreach',
        ticketId: 'ticket-1'
      }));
      expect(auditLogService.logAction).toHaveBeenCalledWith(
        'SLA_BREACH', 'Ticket', 'ticket-1', null, expect.any(Object)
      );
    });

    it('should send warning if <= 20% remaining and not warned', async () => {
      const mockTicket = {
        id: 'ticket-2',
        ticketNumber: 'TKT-2',
        slaDueAt: new Date(),
        priority: { name: 'MEDIUM', slaResolutionMinutes: 120 },
        assignments: []
      };
      
      prismaService.ticket.findMany.mockResolvedValueOnce([mockTicket]);
      prismaService.ticket.findMany.mockResolvedValueOnce([]); // for updateSlaCacheMetrics
      
      slaService.isOverdue.mockReturnValue(false);
      slaService.isWarning.mockReturnValue(true);
      redisService.get.mockResolvedValue(null); // Not warned yet

      await service.checkSlaCompliance();

      expect(rabbitmqService.publish).toHaveBeenCalledWith('sla.events', 'sla.warning', expect.any(Object));
      expect(redisService.set).toHaveBeenCalledWith(`sla:warned:ticket-2`, 'true', 86400);
    });
  });

  describe('autoCloseResolvedTickets', () => {
    it('should close tickets resolved > 72 hours ago', async () => {
      const mockTicket = {
        id: 'ticket-3',
        ticketNumber: 'TKT-3',
        createdById: 'user-1',
        assignments: []
      };

      prismaService.ticket.findMany.mockResolvedValue([mockTicket]);

      await service.autoCloseResolvedTickets();

      expect(prismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-3' },
        data: { status: TicketStatus.CLOSED, closedAt: expect.any(Date) }
      });
      expect(prismaService.ticketHistory.create).toHaveBeenCalled();
      expect(rabbitmqService.publish).toHaveBeenCalledWith('ticket.events', 'ticket.closed', expect.objectContaining({
        autoClose: true
      }));
    });
  });
});
