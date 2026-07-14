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
  ) {}

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

        // Insert into TicketHistory if it relates to status change or assignment
        // Since we don't have eventId in TicketHistory, we rely on the transaction with ActivityLog for idempotency
        if (routingKey === 'ticket.status_changed' || routingKey === 'ticket.resolved' || routingKey === 'ticket.closed' || routingKey === 'ticket.rejected') {
          await tx.ticketHistory.create({
            data: {
              ticketId: payload.ticketId,
              fromStatus: payload.oldStatus,
              toStatus: payload.status || routingKey.split('.')[1].toUpperCase(),
              changedById: userId,
              note: payload.reason || payload.note || null,
            }
          });
        }
      });
      
    } catch (error: any) {
      this.logger.error(`Failed to process message: ${content}`, error);
      throw error; // Let the dead letter exchange handle it after retries
    }
  }
}
