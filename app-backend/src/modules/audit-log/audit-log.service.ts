import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Request } from 'express';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

export enum AuditLogAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_ASSIGNED = 'TICKET_ASSIGNED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
  TICKET_RESOLVED = 'TICKET_RESOLVED',
  TICKET_REJECTED = 'TICKET_REJECTED',
  ATTACHMENT_UPLOADED = 'ATTACHMENT_UPLOADED',
  TICKET_RATED = 'TICKET_RATED',
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    action: AuditLogAction | string,
    entityType: string,
    entityId: string,
    performedByUserId: string | null,
    metadata: any = {},
    req?: Request,
    eventId?: string,
  ): Promise<void> {
    try {
      const ipAddress = req?.ip || req?.socket?.remoteAddress || 'unknown';

      await this.prisma.activityLog.create({
        data: {
          action,
          entityType,
          entityId,
          userId: performedByUserId,
          metadata,
          ipAddress,
          eventId,
        },
      });
    } catch (error: any) {
      // Ignore unique constraint violation if eventId already exists
      if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
        this.logger.debug(`ActivityLog with eventId ${eventId} already exists. Skipping.`);
        return;
      }
      this.logger.error(`Failed to create audit log for action ${action}`, error);
    }
  }

  async log(dto: CreateAuditLogDto): Promise<any> {
    try {
      return await this.prisma.activityLog.create({
        data: {
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          userId: dto.userId || null,
          metadata: dto.metadata || {},
          ipAddress: dto.ipAddress,
          eventId: dto.eventId,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('eventId')) {
        this.logger.debug(`ActivityLog with eventId ${dto.eventId} already exists.`);
        return null;
      }
      throw error;
    }
  }

  async findAll(filters: AuditLogFilterDto) {
    const { userId, action, entityType, entityId, dateFrom, dateTo, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      }),
      this.prisma.activityLog.count({ where })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } }
    });
  }

  async findOne(id: string) {
    return this.prisma.activityLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
  }
}
