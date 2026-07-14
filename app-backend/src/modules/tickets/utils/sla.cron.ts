import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { RabbitMQService } from '../../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { SlaService } from './sla.service';
import { TicketStatus } from '@prisma/client';
import { AuditLogService, AuditLogAction } from '../../audit-log/audit-log.service';

@Injectable()
export class SlaCronService {
  private readonly logger = new Logger(SlaCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqService: RabbitMQService,
    private readonly redisService: RedisService,
    private readonly slaService: SlaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron('*/5 * * * *')
  async checkSlaCompliance() {
    this.logger.log('Running SLA compliance check...');

    try {
      const activeTickets = await this.prisma.ticket.findMany({
        where: {
          status: { in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] },
          slaDueAt: { not: null },
          isOverdue: false, // Only check those that are not yet breached
        },
        include: {
          priority: true,
          assignments: { where: { isActive: true } },
        },
      });

      let overdueCount = 0;
      let warningCount = 0;
      const overdueList: any[] = [];

      for (const ticket of activeTickets) {
        if (!ticket.slaDueAt) continue;

        const totalMinutes = ticket.priority.slaResolutionMinutes;
        const isOverdue = this.slaService.isOverdue(ticket.slaDueAt);
        const isWarning = this.slaService.isWarning(ticket.slaDueAt, totalMinutes);
        const assignedTo = ticket.assignments[0]?.technicianId || null;

        if (isOverdue) {
          overdueCount++;
          
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { isOverdue: true },
          });

          const breachEvent = {
            eventType: 'SlaBreach',
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            priority: ticket.priority.name,
            slaDueAt: ticket.slaDueAt.toISOString(),
            overdueMinutes: Math.abs(this.slaService.getRemainingTime(ticket.slaDueAt)),
            assignedTo,
            timestamp: new Date().toISOString(),
          };

          await this.rabbitmqService.publish('sla.events', 'sla.breach', breachEvent);
          await this.auditLogService.logAction(
            'SLA_BREACH',
            'Ticket',
            ticket.id,
            null,
            breachEvent
          );
          
          overdueList.push(breachEvent);
        } else if (isWarning) {
          const warningKey = `sla:warned:${ticket.id}`;
          const hasWarned = await this.redisService.get(warningKey);

          if (!hasWarned) {
            warningCount++;
            const warningEvent = {
              eventType: 'SlaWarning',
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              priority: ticket.priority.name,
              slaDueAt: ticket.slaDueAt.toISOString(),
              remainingMinutes: this.slaService.getRemainingTime(ticket.slaDueAt),
              remainingPercentage: this.slaService.getRemainingPercentage(ticket.slaDueAt, totalMinutes),
              assignedTo,
              timestamp: new Date().toISOString(),
            };

            await this.rabbitmqService.publish('sla.events', 'sla.warning', warningEvent);
            // Expire after typical SLA timeframe or at least 1 day so it doesn't spam
            await this.redisService.set(warningKey, 'true', 86400);
          }
        }
      }

      // Update compliance cache metrics
      await this.updateSlaCacheMetrics(overdueList);

      this.logger.log(`SLA Check complete. Breached: ${overdueCount}, Warnings sent: ${warningCount}`);
    } catch (error) {
      this.logger.error('Error during SLA compliance check', error);
    }
  }

  @Cron('0 * * * *')
  async autoCloseResolvedTickets() {
    this.logger.log('Running auto-close check for resolved tickets...');
    
    try {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours
      
      const resolvedTickets = await this.prisma.ticket.findMany({
        where: {
          status: TicketStatus.RESOLVED,
          resolvedAt: { lte: threeDaysAgo },
        },
        include: {
          assignments: { where: { isActive: true } }
        }
      });

      let closedCount = 0;

      for (const ticket of resolvedTickets) {
        await this.prisma.$transaction(async (tx) => {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: TicketStatus.CLOSED,
              closedAt: new Date(),
            },
          });

          await tx.ticketHistory.create({
            data: {
              ticketId: ticket.id,
              fromStatus: TicketStatus.RESOLVED,
              toStatus: TicketStatus.CLOSED,
              changedById: ticket.createdById, // Simulating action by owner or system
              note: 'Auto-closed: tidak ada respons dalam 3x24 jam',
            },
          });
        });

        const assignedTo = ticket.assignments[0]?.technicianId || null;
        
        await this.rabbitmqService.publish('ticket.events', 'ticket.closed', {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          oldStatus: TicketStatus.RESOLVED,
          status: TicketStatus.CLOSED,
          closedBy: 'system',
          assignedTo,
          autoClose: true,
          note: 'Auto-closed: tidak ada respons dalam 3x24 jam',
        });

        await this.auditLogService.logAction(
          'TICKET_CLOSED',
          'Ticket',
          ticket.id,
          null, // System action
          { autoClose: true, reason: '72 hours no response' }
        );

        closedCount++;
      }

      this.logger.log(`Auto-close check complete. Tickets closed: ${closedCount}`);
    } catch (error) {
      this.logger.error('Error during auto-close check', error);
    }
  }

  private async updateSlaCacheMetrics(newOverdueList: any[]) {
    try {
      // Refresh the entire overdue list for dashboard
      const allOverdueTickets = await this.prisma.ticket.findMany({
        where: { isOverdue: true, status: { in: [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] } },
        select: { id: true, ticketNumber: true, status: true, priority: { select: { name: true } }, slaDueAt: true },
      });
      await this.redisService.set('sla:overdue:list', JSON.stringify(allOverdueTickets), 300); // TTL 5 min

      // Compliance rate
      const totalTicketsCount = await this.prisma.ticket.count();
      const compliantTicketsCount = await this.prisma.ticket.count({ where: { isOverdue: false } });
      const rate = totalTicketsCount > 0 ? (compliantTicketsCount / totalTicketsCount) * 100 : 100;
      
      await this.redisService.set('sla:compliance:rate', rate.toString(), 300); // TTL 5 min
    } catch (error) {
      this.logger.error('Failed to update SLA cache metrics', error);
    }
  }
}
