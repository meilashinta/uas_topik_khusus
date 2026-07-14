import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventPublisher } from '../../infrastructure/rabbitmq/event-publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { TicketStateMachineService } from './utils/ticket-state-machine.service';
import { IFileStorageServiceToken } from '../../infrastructure/storage/storage.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketStatus, RoleName } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaMock: any;
  let auditLogMock: any;
  let eventPublisherMock: any;
  let redisMock: any;
  let ticketGeneratorMock: any;
  let stateMachineMock: any;
  let storageMock: any;

  beforeEach(async () => {
    prismaMock = {
      ticketCategory: { findUnique: jest.fn() },
      ticketPriority: { findUnique: jest.fn() },
      ticket: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findFirst: jest.fn() },
      assignment: { updateMany: jest.fn() },
    };
    auditLogMock = { logAction: jest.fn() };
    eventPublisherMock = { publishTicketEvent: jest.fn() };
    redisMock = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    ticketGeneratorMock = { generate: jest.fn() };
    stateMachineMock = {
      validateTransition: jest.fn(),
      validateTransitionRole: jest.fn(),
    };
    storageMock = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: EventPublisher, useValue: eventPublisherMock },
        { provide: RedisService, useValue: redisMock },
        { provide: TicketNumberGenerator, useValue: ticketGeneratorMock },
        { provide: TicketStateMachineService, useValue: stateMachineMock },
        { provide: IFileStorageServiceToken, useValue: storageMock },
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
  });

  describe('reject', () => {
    it('should call state machine validate', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.OPEN });
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', status: TicketStatus.REJECTED });
      await service.reject('t1', { reason: 'Duplicate' }, { userId: 'sup1', role: RoleName.SUPERVISOR }, {});
      expect(stateMachineMock.validateTransition).toHaveBeenCalledWith(TicketStatus.OPEN, TicketStatus.REJECTED);
      expect(stateMachineMock.validateTransitionRole).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should call state machine validate', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', status: TicketStatus.RESOLVED });
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', status: TicketStatus.CLOSED });
      await service.close('t1', { rating: 5 }, { userId: 'u1', role: RoleName.EMPLOYEE }, {});
      expect(stateMachineMock.validateTransition).toHaveBeenCalledWith(TicketStatus.RESOLVED, TicketStatus.CLOSED);
      expect(stateMachineMock.validateTransitionRole).toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    it('should assign a technician', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN, priority: { slaResolutionMinutes: 60 } });
      prismaMock.user.findFirst.mockResolvedValue({ id: 'tech1' });
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', ticketNumber: 'TKT-1' });

      await service.assign('t1', { technicianId: 'tech1' }, { userId: 'sup1' }, {});

      expect(prismaMock.ticket.update).toHaveBeenCalled();
      expect(stateMachineMock.validateTransition).toHaveBeenCalledWith(TicketStatus.OPEN, TicketStatus.ASSIGNED);
    });
  });

  describe('reassign', () => {
    it('should throw if ticket is not ASSIGNED or IN_PROGRESS', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN, assignments: [] });
      await expect(service.reassign('t1', { technicianId: 'tech1', reason: 'r' }, { userId: 'sup1' }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should reassign a technician', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.ASSIGNED, assignments: [{ technicianId: 'tech1' }] });
      prismaMock.user.findFirst.mockResolvedValue({ id: 'tech2' });
      prismaMock.assignment.updateMany = jest.fn().mockResolvedValue({});
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', ticketNumber: 'TKT-1' });

      await service.reassign('t1', { technicianId: 'tech2', reason: 'r' }, { userId: 'sup1' }, {});

      expect(prismaMock.assignment.updateMany).toHaveBeenCalled();
      expect(prismaMock.ticket.update).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should throw ForbiddenException if employee creates internal comment', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'emp1' });
      
      await expect(service.addComment('t1', { content: 'test', isInternal: true }, { userId: 'emp1', role: RoleName.EMPLOYEE }, {}))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow employee to create public comment', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'emp1' });
      prismaMock.ticketComment = { create: jest.fn().mockResolvedValue({}) };
      
      await service.addComment('t1', { content: 'test', isInternal: false }, { userId: 'emp1', role: RoleName.EMPLOYEE }, {});
      expect(prismaMock.ticketComment.create).toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('should force isInternal=false for employee', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'emp1' });
      prismaMock.ticketComment = { findMany: jest.fn().mockResolvedValue([]) };

      await service.getComments('t1', { isInternal: true }, { userId: 'emp1', role: RoleName.EMPLOYEE });
      
      expect(prismaMock.ticketComment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { ticketId: 't1', isInternal: false }
      }));
    });
  });

  describe('uploadAttachment', () => {
    it('should throw BadRequestException if ticket already has 5 attachments', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'emp1', _count: { attachments: 5 } });
      const file = { originalname: 'test.jpg', size: 100, mimetype: 'image/jpeg' } as Express.Multer.File;

      await expect(service.uploadAttachment('t1', file, { userId: 'emp1', role: RoleName.EMPLOYEE }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should upload file and save attachment metadata', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'emp1', _count: { attachments: 2 } });
      prismaMock.ticketAttachment = { create: jest.fn().mockResolvedValue({ id: 'att1', fileName: 'test.jpg' }) };
      
      const file = { originalname: 'test.jpg', size: 100, mimetype: 'image/jpeg' } as Express.Multer.File;
      await service.uploadAttachment('t1', file, { userId: 'emp1', role: RoleName.EMPLOYEE }, {});
      
      expect(prismaMock.ticketAttachment.create).toHaveBeenCalled();
    });
  });

});
