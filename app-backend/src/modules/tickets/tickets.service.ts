import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { EventPublisher } from '../../infrastructure/rabbitmq/event-publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { Prisma, TicketStatus, RoleName } from '@prisma/client';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly ticketNumberGenerator: TicketNumberGenerator,
    private readonly eventPublisher: EventPublisher,
    private readonly redisService: RedisService,
  ) {}

  async create(createDto: CreateTicketDto, user: any, req: any) {
    // Validate category
    const category = await this.prisma.ticketCategory.findUnique({ where: { id: createDto.categoryId } });
    if (!category || !category.isActive) {
      throw new BadRequestException('Invalid or inactive category');
    }

    // Validate priority
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

    await this.auditLogService.logAction(
      'TICKET_CREATED',
      'Ticket',
      newTicket.id,
      user.userId,
      { ticketNumber: newTicket.ticketNumber },
      req
    );

    this.eventPublisher.publishTicketEvent('ticket.created', {
      eventType: 'TicketCreated',
      ticketId: newTicket.id,
      ticketNumber: newTicket.ticketNumber,
      createdById: newTicket.createdById,
      categoryId: newTicket.categoryId,
      priorityId: newTicket.priorityId,
    } as any); // using as any in case some fields don't match exactly for now

    return newTicket;
  }

  async findAll(filterDto: TicketFilterDto, user: any) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, status, priorityId, categoryId, departmentId, createdById, dateFrom, dateTo } = filterDto;

    const where: Prisma.TicketWhereInput = {};

    // RBAC logic
    if (user.role === RoleName.EMPLOYEE) {
      where.createdById = user.userId;
    } else if (user.role === RoleName.TECHNICIAN) {
      where.assignments = {
        some: { technicianId: user.userId, isActive: true },
      };
    } // SUPERVISOR and ADMINISTRATOR see all

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
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: { select: { id: true, name: true } },
          priority: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
        assignments: {
          where: { isActive: true },
          include: { technician: { select: { id: true, name: true } } }
        },
        comments: {
          where: user.role === RoleName.EMPLOYEE ? { isInternal: false } : undefined,
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, role: { select: { name: true } } } } }
        },
        attachments: true,
        histories: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { name: true } } } },
        rating: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    this.verifyOwnership(ticket, user);

    await this.redisService.set(cacheKey, JSON.stringify(ticket), 30);
    return ticket;
  }

  async update(id: string, updateDto: UpdateTicketDto, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (ticket.createdById !== user.userId) {
      throw new ForbiddenException('Only the ticket owner can update this ticket');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Tiket hanya dapat diubah saat berstatus OPEN');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id },
      data: updateDto,
    });

    await this.auditLogService.logAction(
      'TICKET_UPDATED',
      'Ticket',
      updatedTicket.id,
      user.userId,
      updateDto,
      req
    );

    await this.redisService.del(`ticket:${id}`);
    return updatedTicket;
  }

  async cancel(id: string, user: any, req: any) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (ticket.createdById !== user.userId) {
      throw new ForbiddenException('Only the ticket owner can cancel this ticket');
    }

    if (ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Tiket hanya dapat dibatalkan saat berstatus OPEN');
    }

    const cancelledTicket = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: TicketStatus.CANCELLED,
        histories: {
          create: {
            fromStatus: TicketStatus.OPEN,
            toStatus: TicketStatus.CANCELLED,
            changedById: user.userId,
            note: 'Cancelled by user',
          }
        }
      },
    });

    await this.auditLogService.logAction(
      'TICKET_CANCELLED',
      'Ticket',
      cancelledTicket.id,
      user.userId,
      { status: TicketStatus.CANCELLED },
      req
    );

    await this.redisService.del(`ticket:${id}`);
    return cancelledTicket;
  }

  private verifyOwnership(ticket: any, user: any) {
    if (user.role === RoleName.EMPLOYEE && ticket.createdById !== user.userId) {
      throw new ForbiddenException('You do not have permission to view this ticket');
    }
    
    if (user.role === RoleName.TECHNICIAN) {
      // Allow if they are assigned to this ticket, or if they created it
      const isAssigned = ticket.assignments?.some((a: any) => a.technicianId === user.userId && a.isActive);
      if (!isAssigned && ticket.createdById !== user.userId) {
        throw new ForbiddenException('You are not assigned to this ticket');
      }
    }
  }
}
