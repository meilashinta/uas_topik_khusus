import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Request } from 'express';

export enum AuditLogAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    action: AuditLogAction | string,
    entityType: string,
    entityId: string,
    performedByUserId: string,
    metadata: any = {},
    req?: Request,
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
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for action ${action}`, error);
    }
  }
}
