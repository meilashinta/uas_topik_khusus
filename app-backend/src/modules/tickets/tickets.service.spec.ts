import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventPublisher } from '../../infrastructure/rabbitmq/event-publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { TicketStateMachineService } from './utils/ticket-state-machine.service';
import { IFileStorageServiceToken } from '../../infrastructure/storage/storage.interface';
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
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

  describe('create', () => {
    it('should throw BadRequestException if category is invalid', async () => {
      prismaMock.ticketCategory.findUnique.mockResolvedValue(null);
      await expect(service.create({ title: 'T', description: 'D', categoryId: 'c1', priorityId: 'p1' }, { userId: 'u1' }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if priority is invalid', async () => {
      prismaMock.ticketCategory.findUnique.mockResolvedValue({ isActive: true });
      prismaMock.ticketPriority.findUnique.mockResolvedValue(null);
      await expect(service.create({ title: 'T', description: 'D', categoryId: 'c1', priorityId: 'p1' }, { userId: 'u1' }, {}))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a ticket successfully', async () => {
      prismaMock.ticketCategory.findUnique.mockResolvedValue({ id: 'c1', isActive: true });
      prismaMock.ticketPriority.findUnique.mockResolvedValue({ id: 'p1', isActive: true });
      ticketGeneratorMock.generate.mockResolvedValue('TKT-1');
      prismaMock.ticket.create.mockResolvedValue({ id: 't1', ticketNumber: 'TKT-1', createdById: 'u1' });

      const result = await service.create({ title: 'T', description: 'D', categoryId: 'c1', priorityId: 'p1' }, { userId: 'u1' }, {});
      
      expect(result.ticketNumber).toBe('TKT-1');
      expect(auditLogMock.logAction).toHaveBeenCalled();
      expect(eventPublisherMock.publishTicketEvent).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated tickets', async () => {
      prismaMock.ticket.findMany = jest.fn().mockResolvedValue([{ id: 't1' }]);
      prismaMock.ticket.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10, status: [TicketStatus.OPEN] }, { userId: 'u1', role: RoleName.EMPLOYEE });
      
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prismaMock.ticket.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return ticket if found and user is authorized', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', category: { departmentId: 'd1' } });
      
      const result = await service.findOne('t1', { userId: 'u1', role: RoleName.EMPLOYEE });
      
      expect(result.id).toBe('t1');
      expect(redisMock.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if ticket not found', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne('t1', { userId: 'u1', role: RoleName.EMPLOYEE }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if technician not assigned', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u2', assignments: [] });
      
      await expect(service.findOne('t1', { userId: 'tech1', role: RoleName.TECHNICIAN }))
        .rejects.toThrow(ForbiddenException);
    });
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

  describe('downloadAttachment', () => {
    it('should throw NotFoundException if attachment not found', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1' });
      prismaMock.ticketAttachment = { findUnique: jest.fn().mockResolvedValue(null) };
      await expect(service.downloadAttachment('t1', 'a1', { userId: 'u1', role: RoleName.EMPLOYEE })).rejects.toThrow(NotFoundException);
    });

    it('should return download stream', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1' });
      prismaMock.ticketAttachment = { findUnique: jest.fn().mockResolvedValue({ id: 'a1', fileUrl: 'url', ticket: { id: 't1', createdById: 'u1' } }) };
      storageMock.download.mockResolvedValue('stream');
      const result = await service.downloadAttachment('t1', 'a1', { userId: 'u1', role: RoleName.EMPLOYEE });
      expect(result.buffer).toBe('stream');
    });
  });

  describe('deleteAttachment', () => {
    it('should throw NotFoundException if attachment not found', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1' });
      prismaMock.ticketAttachment = { findUnique: jest.fn().mockResolvedValue(null) };
      await expect(service.deleteAttachment('t1', 'a1', { userId: 'u1', role: RoleName.EMPLOYEE }, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not authorized', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1' });
      prismaMock.ticketAttachment = { findUnique: jest.fn().mockResolvedValue({ id: 'a1', uploadedById: 'u2', ticket: { id: 't1' } }) };
      await expect(service.deleteAttachment('t1', 'a1', { userId: 'u1', role: RoleName.EMPLOYEE }, {})).rejects.toThrow(ForbiddenException);
    });

    it('should delete attachment successfully', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1' });
      prismaMock.ticketAttachment = { 
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', fileUrl: 'url', uploadedById: 'u1', ticket: { id: 't1' } }),
        delete: jest.fn().mockResolvedValue({})
      };
      storageMock.delete.mockResolvedValue(undefined);

      await service.deleteAttachment('t1', 'a1', { userId: 'u1', role: RoleName.EMPLOYEE }, {});
      
      expect(storageMock.delete).toHaveBeenCalled();
      expect(prismaMock.ticketAttachment.delete).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should throw ForbiddenException if user cannot change status', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN, assignments: [] });
      stateMachineMock.validateTransitionRole.mockImplementation(() => {
        throw new ForbiddenException();
      });
      await expect(service.updateStatus('t1', { status: TicketStatus.ASSIGNED }, { userId: 'u1' }, {}))
        .rejects.toThrow(ForbiddenException);
    });

    it('should update status and call state machine validate', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', status: TicketStatus.OPEN, assignments: [] });
      stateMachineMock.validateTransitionRole.mockImplementation(() => {});
      stateMachineMock.validateTransition.mockImplementation(() => {});
      prismaMock.ticket.update.mockResolvedValue({ id: 't1', status: TicketStatus.ASSIGNED, ticketNumber: 'TKT-1' });

      await service.updateStatus('t1', { status: TicketStatus.ASSIGNED, note: 'ok' }, { userId: 'u1' }, {});

      expect(prismaMock.ticket.update).toHaveBeenCalled();
      expect(auditLogMock.logAction).toHaveBeenCalled();
      expect(eventPublisherMock.publishTicketEvent).toHaveBeenCalled();
    });
  });

  describe('submitRating', () => {
    it('should throw ConflictException if rating already exists', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ 
        id: 't1', 
        createdById: 'emp1', 
        status: TicketStatus.RESOLVED,
        rating: { id: 'r1' },
        assignments: [{ technicianId: 'tech1' }] 
      });

      await expect(service.submitRating('t1', 'emp1', { score: 5 }, {}))
        .rejects.toThrow(ConflictException);
    });

    it('should create rating if valid', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({ 
        id: 't1', 
        createdById: 'emp1', 
        status: TicketStatus.RESOLVED,
        rating: null,
        assignments: [{ technicianId: 'tech1' }] 
      });
      prismaMock.rating = { create: jest.fn().mockResolvedValue({ id: 'r1', score: 5 }) };

      await service.submitRating('t1', 'emp1', { score: 5 }, {});
      
      expect(prismaMock.rating.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ score: 5, ratedById: 'emp1' })
      }));
    });
  });

});
