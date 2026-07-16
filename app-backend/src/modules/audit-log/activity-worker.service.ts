import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConsumeMessage } from 'amqplib';
import { AuditLogAction } from './audit-log.service';

@Injectable()
export class ActivityWorkerService implements OnModuleInit {
  private readonly logger = new Logger(ActivityWorkerService.name);

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly prisma: PrismaService,
  ) { }

  async onModuleInit() {
    setTimeout(() => {
      this.rabbitmqService.subscribe('activity-worker', async (msg) => {
        await this.handleMessage(msg);
      }).catch(err => this.logger.error('Failed to subscribe to activity-worker', err));
    }, 2000);
  }

  private async handleMessage(msg: ConsumeMessage | null) {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const content = msg.content.toString();

    try {
      const payload = JSON.parse(content);
      const eventId = payload.eventId || msg.properties.messageId || `${routingKey}-${Date.now()}`;

      this.logger.log(`Received event for activity log: ${routingKey}`);

      let action: string = routingKey.toUpperCase().replace(/\./g, '_');

      // We will perform a transaction to insert into ActivityLog and TicketHistory (if applicable)
      await this.prisma.$transaction(async (tx) => {
        // Check idempotency on ActivityLog
        const existingLog = await tx.activityLog.findUnique({ where: { eventId } });
        if (existingLog) {
          this.logger.debug(`ActivityLog for eventId ${eventId} already exists, skipping.`);
          return;
        }

        const userId = payload.changedBy || payload.assignedBy || payload.createdById || payload.resolvedBy || payload.closedBy || payload.rejectedBy || payload.userId || null;

        await tx.activityLog.create({
          data: {
            action,
            entityType: 'Ticket',
            entityId: payload.ticketId,
            userId: userId,
            eventId: eventId,
            metadata: payload,
            ipAddress: 'rabbitmq-worker',
          }
        });

        // Note: TicketHistory is handled synchronously in tickets.service.ts to ensure immediate UI consistency.
      });

    } catch (error: any) {
      console.error('ACTIVITY WORKER ERROR:', error);
      this.logger.error(`Failed to process message: ${content}`, error);
      throw error; // Let the dead letter exchange handle it after retries
    }
  }
}
