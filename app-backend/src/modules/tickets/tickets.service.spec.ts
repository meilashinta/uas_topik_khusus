import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventPublisher } from '../../infrastructure/rabbitmq/event-publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketStatus, RoleName } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaMock: any;
  let auditLogMock: any;
  let eventPublisherMock: any;
  let redisMock: any;
  let ticketGeneratorMock: any;

  beforeEach(async () => {
    prismaMock = {
      ticketCategory: { findUnique: jest.fn() },
      ticketPriority: { findUnique: jest.fn() },
      ticket: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    auditLogMock = { logAction: jest.fn() };
    eventPublisherMock = { publishTicketEvent: jest.fn() };
    redisMock = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    ticketGeneratorMock = { generate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: EventPublisher, useValue: eventPublisherMock },
        { provide: RedisService, useValue: redisMock },
        { provide: TicketNumberGenerator, useValue: ticketGeneratorMock },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('should throw error if ticket is not OPEN', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.IN_PROGRESS });
      await expect(service.update('t1', { title: 'New' }, { userId: 'u1' }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error if not owner', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u2', status: TicketStatus.OPEN });
      await expect(service.update('t1', { title: 'New' }, { userId: 'u1' }, {}))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow update if owner and OPEN', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.OPEN });
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', title: 'New' });
      await service.update('t1', { title: 'New' }, { userId: 'u1' }, {});
      expect(prismaMock.ticket.update).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should throw error if not OPEN', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.ASSIGNED });
      await expect(service.cancel('t1', { userId: 'u1' }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow cancel and set status CANCELLED', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.OPEN });
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', status: TicketStatus.CANCELLED });
      await service.cancel('t1', { userId: 'u1' }, {});
      expect(prismaMock.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: TicketStatus.CANCELLED })
      }));
    });
  });
});
