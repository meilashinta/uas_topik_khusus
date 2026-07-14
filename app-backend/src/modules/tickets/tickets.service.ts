import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { EventPublisher } from '../../infrastructure/rabbitmq/event-publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TicketStateMachineService } from './utils/ticket-state-machine.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { RejectTicketDto } from './dto/reject-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { ReassignTechnicianDto } from './dto/reassign-technician.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentFilterDto } from './dto/comment-filter.dto';
import { Prisma, TicketStatus, RoleName } from '@prisma/client';
import { IFileStorageServiceToken } from '../../infrastructure/storage/storage.interface';
import type { IFileStorageService } from '../../infrastructure/storage/storage.interface';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly ticketNumberGenerator: TicketNumberGenerator,
    private readonly eventPublisher: EventPublisher,
    private readonly redisService: RedisService,
    private readonly stateMachine: TicketStateMachineService,
    @Inject(IFileStorageServiceToken) private readonly storageService: IFileStorageService,
  ) {}

  async create(createDto: CreateTicketDto, user: any, req: any) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id: createDto.categoryId } });
    if (!category || !category.isActive) {
      throw new BadRequestException('Invalid or inactive category');
    }

    const priority = await this.prisma.ticketPriority.findUnique({ where: { id: createDto.priorityId } });
    if (!priority || !priority.isActive) {
      throw new BadRequestException('Invalid or inactive priority');
    }

    const ticketNumber = await this.ticketNumberGenerator.generate();

    const newTicket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        title: createDto.title,
        description: createDto.description,
        categoryId: createDto.categoryId,
        priorityId: createDto.priorityId,
        createdById: user.userId,
        status: TicketStatus.OPEN,
        histories: {
          create: {
            toStatus: TicketStatus.OPEN,
            changedById: user.userId,
            note: 'Ticket created',
          },
        },
      },
    });

    await this.auditLogService.logAction('TICKET_CREATED', 'Ticket', newTicket.id, user.userId, { ticketNumber: newTicket.ticketNumber }, req);

    this.eventPublisher.publishTicketEvent('ticket.created', {
      eventType: 'TicketCreated',
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticketNumber,
      createdById: newTicket.createdById,
      categoryId: newTicket.categoryId,
      priorityId: newTicket.priorityId,
    } as any);

    return newTicket;
  }

  async findAll(filterDto: TicketFilterDto, user: any) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, status, priorityId, categoryId, departmentId, createdById, dateFrom, dateTo } = filterDto;
    const where: Prisma.TicketWhereInput = {};

    if (user.role === RoleName.EMPLOYEE) {
      where.createdById = user.userId;
    } else if (user.role === RoleName.TECHNICIAN) {
      where.assignments = {
        some: { technicianId: user.userId, isActive: true },
      };
    } 

    if (status && status.length > 0) where.status = { in: status };
    if (priorityId) where.priorityId = priorityId;
    if (categoryId) where.categoryId = categoryId;
    if (departmentId) where.category = { departmentId };
    if (createdById) where.createdById = createdById;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true } },
          priority: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data: tickets, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user: any) {
    const cacheKey = `ticket:${id}`;
    const cachedData = await this.redisService.get(cacheKey);
    
    if (cachedData) {
      const cachedTicket = JSON.parse(cachedData);
      this.verifyOwnership(cachedTicket, user);
      return cachedTicket;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        priority: { select: { id: true, name: true, slaResponseMinutes: true, slaResolutionMinutes: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        assignments: { where: { isActive: true }, include: { technician: { select: { id: true, name: true } } } },
        comments: { where: user.role === RoleName.EMPLOYEE ? { isInternal: false } : undefined, orderBy: { createdAt: 'asc' }, include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } } },
        attachments: true,
        histories: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { name: true } } } },
        rating: true,
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    this.verifyOwnership(ticket, user);
    await this.redisService.set(cacheKey, JSON.stringify(ticket), 30);
    return ticket;
  }

  async update(id: string, updateDto: UpdateTicketDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.createdById !== user.userId) throw new ForbiddenException('Only the ticket owner can update this ticket');
    if (ticket.status !== TicketStatus.OPEN) throw new BadRequestException('Tiket hanya dapat diubah saat berstatus OPEN');

    const updatedTicket = await this.prisma.ticket.update({ where: { id }, data: updateDto });
    await this.auditLogService.logAction('TICKET_UPDATED', 'Ticket', updatedTicket.id, user.userId, updateDto, req);
    await this.redisService.del(`ticket:${id}`);
    return updatedTicket;
  }

  async cancel(id: string, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, TicketStatus.CANCELLED);
    this.stateMachine.validateTransitionRole(ticket.status, TicketStatus.CANCELLED, user, ticket);

    const cancelledTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CANCELLED,
        histories: { create: { fromStatus: ticket.status, toStatus: TicketStatus.CANCELLED, changedById: user.userId, note: 'Cancelled by user' } }
      },
    });

    await this.auditLogService.logAction('TICKET_CANCELLED', 'Ticket', cancelledTicket.id, user.userId, { status: TicketStatus.CANCELLED }, req);
    await this.redisService.del(`ticket:${id}`);
    return cancelledTicket;
  }

  async reject(id: string, rejectDto: RejectTicketDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, TicketStatus.REJECTED);
    this.stateMachine.validateTransitionRole(ticket.status, TicketStatus.REJECTED, user, ticket);

    const rejectedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.REJECTED,
        histories: { create: { fromStatus: ticket.status, toStatus: TicketStatus.REJECTED, changedById: user.userId, note: rejectDto.reason } }
      },
    });

    await this.auditLogService.logAction('TICKET_REJECTED', 'Ticket', rejectedTicket.id, user.userId, { reason: rejectDto.reason }, req);
    this.eventPublisher.publishTicketEvent('ticket.rejected', { eventType: 'TicketRejected', ticketId: rejectedTicket.id, ticketNumber: rejectedTicket.ticketNumber } as any);
    await this.redisService.del(`ticket:${id}`);
    return rejectedTicket;
  }

  async close(id: string, closeDto: CloseTicketDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, TicketStatus.CLOSED);
    this.stateMachine.validateTransitionRole(ticket.status, TicketStatus.CLOSED, user, ticket);

    const closedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
        rating: { create: { ratedById: user.userId, score: closeDto.rating, feedback: closeDto.feedback } },
        histories: { create: { fromStatus: ticket.status, toStatus: TicketStatus.CLOSED, changedById: user.userId, note: 'Closed by user' } }
      },
    });

    await this.auditLogService.logAction('TICKET_CLOSED', 'Ticket', closedTicket.id, user.userId, { rating: closeDto.rating }, req);
    this.eventPublisher.publishTicketEvent('ticket.closed', { eventType: 'TicketClosed', ticketId: closedTicket.id, ticketNumber: closedTicket.ticketNumber } as any);
    await this.redisService.del(`ticket:${id}`);
    return closedTicket;
  }

  async reopen(id: string, reopenDto: ReopenTicketDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, TicketStatus.IN_PROGRESS);
    this.stateMachine.validateTransitionRole(ticket.status, TicketStatus.IN_PROGRESS, user, ticket);

    const reopenedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.IN_PROGRESS,
        resolvedAt: null, // clear resolution time
        histories: { create: { fromStatus: ticket.status, toStatus: TicketStatus.IN_PROGRESS, changedById: user.userId, note: reopenDto.reason } }
      },
    });

    await this.auditLogService.logAction('TICKET_REOPENED', 'Ticket', reopenedTicket.id, user.userId, { reason: reopenDto.reason }, req);
    this.eventPublisher.publishTicketEvent('ticket.status_changed', { eventType: 'TicketReopened', ticketId: reopenedTicket.id, ticketNumber: reopenedTicket.ticketNumber } as any);

    // Future logic: Send notification to assigned technicians
    // ...

    await this.redisService.del(`ticket:${id}`);
    return reopenedTicket;
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, updateStatusDto.status);
    this.stateMachine.validateTransitionRole(ticket.status, updateStatusDto.status, user, ticket);

    if (updateStatusDto.status === TicketStatus.RESOLVED && !updateStatusDto.note) {
      throw new BadRequestException('Note is required when resolving a ticket');
    }

    const data: Prisma.TicketUpdateInput = {
      status: updateStatusDto.status,
      histories: { create: { fromStatus: ticket.status, toStatus: updateStatusDto.status, changedById: user.userId, note: updateStatusDto.note } }
    };

    if (updateStatusDto.status === TicketStatus.RESOLVED) {
      data.resolvedAt = new Date();
    }

    const updatedTicket = await this.prisma.ticket.update({ where: { id }, data });
    await this.auditLogService.logAction('TICKET_STATUS_UPDATED', 'Ticket', updatedTicket.id, user.userId, { status: updateStatusDto.status }, req);
    this.eventPublisher.publishTicketEvent('ticket.status_changed', { eventType: 'TicketStatusUpdated', ticketId: updatedTicket.id, ticketNumber: updatedTicket.ticketNumber } as any);
    await this.redisService.del(`ticket:${id}`);
    return updatedTicket;
  }

  async getHistory(id: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.verifyOwnership(ticket, user);

    const history = await this.prisma.ticketHistory.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: 'asc' },
      include: { changedBy: { select: { name: true } } }
    });

    return history;
  }

  async assign(id: string, assignDto: AssignTechnicianDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { priority: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.stateMachine.validateTransition(ticket.status, TicketStatus.ASSIGNED);
    this.stateMachine.validateTransitionRole(ticket.status, TicketStatus.ASSIGNED, user, ticket);

    const technician = await this.prisma.user.findFirst({
      where: { id: assignDto.technicianId, isActive: true, role: { name: RoleName.TECHNICIAN } }
    });
    if (!technician) throw new BadRequestException('Invalid or inactive technician');

    const slaDueAt = new Date(Date.now() + ticket.priority.slaResolutionMinutes * 60000);

    const assignedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.ASSIGNED,
        slaDueAt,
        assignments: {
          create: {
            technicianId: assignDto.technicianId,
            assignedById: user.userId,
            isActive: true,
          }
        },
        histories: {
          create: {
            fromStatus: ticket.status,
            toStatus: TicketStatus.ASSIGNED,
            changedById: user.userId,
            note: 'Ticket assigned to technician'
          }
        }
      }
    });

    await this.auditLogService.logAction('TICKET_ASSIGNED', 'Ticket', assignedTicket.id, user.userId, { technicianId: assignDto.technicianId }, req);
    this.eventPublisher.publishTicketEvent('ticket.assigned', { eventType: 'TicketAssigned', ticketId: assignedTicket.id, ticketNumber: assignedTicket.ticketNumber, assignedTo: assignDto.technicianId, assignedBy: user.userId, priority: ticket.priority.name, slaDueAt: slaDueAt.toISOString() } as any);
    await this.redisService.del(`ticket:${id}`);
    return assignedTicket;
  }

  async reassign(id: string, reassignDto: ReassignTechnicianDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Custom check: must be ASSIGNED or IN_PROGRESS (meaning it's active and not resolved)
    if (ticket.status !== TicketStatus.ASSIGNED && ticket.status !== TicketStatus.IN_PROGRESS) {
      throw new BadRequestException('Ticket must be ASSIGNED or IN_PROGRESS to be reassigned');
    }

    const currentAssignment = ticket.assignments[0];
    if (currentAssignment && currentAssignment.technicianId === reassignDto.technicianId) {
      throw new BadRequestException('Technician is already assigned to this ticket');
    }

    const newTechnician = await this.prisma.user.findFirst({
      where: { id: reassignDto.technicianId, isActive: true, role: { name: RoleName.TECHNICIAN } }
    });
    if (!newTechnician) throw new BadRequestException('Invalid or inactive technician');

    // Deactivate old assignment, create new
    await this.prisma.assignment.updateMany({
      where: { ticketId: id, isActive: true },
      data: { isActive: false }
    });

    const reassignedTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.ASSIGNED, // Reverts back to assigned even if it was in progress
        assignments: {
          create: {
            technicianId: reassignDto.technicianId,
            assignedById: user.userId,
            reason: reassignDto.reason,
            isActive: true,
          }
        },
        histories: {
          create: {
            fromStatus: ticket.status,
            toStatus: TicketStatus.ASSIGNED,
            changedById: user.userId,
            note: `Reassigned: ${reassignDto.reason}`
          }
        }
      }
    });

    await this.auditLogService.logAction('TICKET_REASSIGNED', 'Ticket', reassignedTicket.id, user.userId, { technicianId: reassignDto.technicianId, reason: reassignDto.reason }, req);
    this.eventPublisher.publishTicketEvent('ticket.assigned', { eventType: 'TicketReassigned', ticketId: reassignedTicket.id, ticketNumber: reassignedTicket.ticketNumber, assignedTo: reassignDto.technicianId, assignedBy: user.userId } as any);
    await this.redisService.del(`ticket:${id}`);
    return reassignedTicket;
  }

  async addComment(id: string, createCommentDto: CreateCommentDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.verifyOwnership(ticket, user);

    if (user.role === RoleName.EMPLOYEE && createCommentDto.isInternal) {
      throw new ForbiddenException('Employees cannot create internal comments');
    }

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: user.userId,
        content: createCommentDto.content,
        isInternal: createCommentDto.isInternal ?? false,
      },
      include: {
        user: { select: { name: true, role: { select: { name: true } } } }
      }
    });

    await this.redisService.del(`ticket:${id}`);
    
    // Optional: publish event for real-time socket
    // this.eventPublisher.publishTicketEvent('ticket.commented', { ... });

    return comment;
  }

  async getComments(id: string, filterDto: CommentFilterDto, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.verifyOwnership(ticket, user);

    const where: Prisma.TicketCommentWhereInput = { ticketId: id };

    if (user.role === RoleName.EMPLOYEE) {
      where.isInternal = false;
    } else if (filterDto.isInternal !== undefined) {
      where.isInternal = filterDto.isInternal;
    }

    const comments = await this.prisma.ticketComment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: { select: { name: true } } } }
      }
    });

    return comments;
  }

  async uploadAttachment(id: string, file: Express.Multer.File, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ 
      where: { id }, 
      include: { 
        assignments: { where: { isActive: true } },
        _count: { select: { attachments: true } }
      } 
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.verifyOwnership(ticket, user);

    if (ticket._count.attachments >= 5) {
      throw new BadRequestException('Maksimum 5 lampiran per tiket');
    }

    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    const fileUrl = await this.storageService.upload(file, uniqueFilename);

    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        ticketId: id,
        uploadedById: user.userId,
        fileName: file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      }
    });

    await this.auditLogService.logAction(
      'ATTACHMENT_UPLOADED',
      'TicketAttachment',
      attachment.id,
      user.userId,
      { fileName: attachment.fileName, fileSize: attachment.fileSize },
      req
    );

    return attachment;
  }

  async downloadAttachment(id: string, attachmentId: string, user: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    this.verifyOwnership(ticket, user);

    const attachment = await this.prisma.ticketAttachment.findUnique({ where: { id: attachmentId, ticketId: id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const buffer = await this.storageService.download(attachment.fileUrl);
    return { buffer, attachment };
  }

  async deleteAttachment(id: string, attachmentId: string, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: { assignments: { where: { isActive: true } } } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const attachment = await this.prisma.ticketAttachment.findUnique({ where: { id: attachmentId, ticketId: id } });
    if (!attachment) throw new NotFoundException('Attachment not found');

    const isOwner = attachment.uploadedById === user.userId;
    const isSupervisorOrAdmin = user.role === RoleName.SUPERVISOR || user.role === RoleName.ADMINISTRATOR;

    if (!isOwner && !isSupervisorOrAdmin) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }

    if (ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.REJECTED || ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Cannot delete attachments from closed or rejected tickets');
    }

    await this.storageService.delete(attachment.fileUrl);
    await this.prisma.ticketAttachment.delete({ where: { id: attachmentId } });

    await this.auditLogService.logAction(
      'ATTACHMENT_DELETED',
      'TicketAttachment',
      attachment.id,
      user.userId,
      { fileName: attachment.fileName },
      req
    );
  }

  private verifyOwnership(ticket: any, user: any) {
    if (user.role === RoleName.EMPLOYEE && ticket.createdById !== user.userId) {
      throw new ForbiddenException('You do not have permission to access this ticket');
    }
    if (user.role === RoleName.TECHNICIAN) {
      const isAssigned = ticket.assignments?.some((a: any) => a.technicianId === user.userId && a.isActive);
      if (!isAssigned && ticket.createdById !== user.userId) {
        throw new ForbiddenException('You are not assigned to this ticket');
      }
    }
  }
}
