import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationType } from './notification-type.enum';
import { ConsumeMessage } from 'amqplib';

@Injectable()
export class NotificationWorkerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorkerService.name);

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Wait a bit for RabbitMQ to connect if needed, but rabbitmqService.onModuleInit runs first usually.
    setTimeout(() => {
      this.rabbitmqService.subscribe('notification-worker', async (msg) => {
        await this.handleMessage(msg);
      }).catch(err => this.logger.error('Failed to subscribe to notification-worker', err));
    }, 2000);
  }

  private async handleMessage(msg: ConsumeMessage | null) {
    if (!msg) return;
    
    const routingKey = msg.fields.routingKey;
    const content = msg.content.toString();
    
    try {
      const payload = JSON.parse(content);
      const eventId = payload.eventId || msg.properties.messageId || `${routingKey}-${Date.now()}`;
      
      this.logger.log(`Received event: ${routingKey}`);

      switch (routingKey) {
        case 'ticket.created':
          await this.handleTicketCreated(payload, eventId);
          break;
        case 'ticket.assigned':
          await this.handleTicketAssigned(payload, eventId);
          break;
        case 'ticket.status_changed':
          await this.handleTicketStatusChanged(payload, eventId);
          break;
        case 'ticket.resolved':
          await this.handleTicketResolved(payload, eventId);
          break;
        case 'ticket.closed':
          await this.handleTicketClosed(payload, eventId);
          break;
        case 'ticket.rejected':
          await this.handleTicketRejected(payload, eventId);
          break;
        case 'ticket.comment_added':
          await this.handleTicketCommentAdded(payload, eventId);
          break;
        case 'sla.warning':
          await this.handleSlaWarning(payload, eventId);
          break;
        case 'sla.breach':
          await this.handleSlaBreach(payload, eventId);
          break;
        default:
          this.logger.warn(`Unhandled routing key: ${routingKey}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process message: ${content}`, error);
      throw error; // Will be sent to DLQ by RabbitMQService
    }
  }

  private async notifyUser(userId: string, type: NotificationType, title: string, message: string, eventId: string, emailHtml?: string, emailSubject?: string) {
    // 1. Create In-App Notification (Idempotent)
    const notification = await this.notificationsService.createNotification(userId, type, title, message, eventId);
    
    // 2. Check preference and send email
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.emailNotificationEnabled && emailHtml && emailSubject) {
      // Send async without blocking
      this.emailService.sendEmail(user.email, emailSubject, emailHtml).catch((err: any) => {
        this.logger.warn(`Failed to send email to ${user.email}: ${err.message}`);
      });
    }
  }

  // Event Handlers
  private async handleTicketCreated(payload: any, eventId: string) {
    const { ticketId, ticketNumber, categoryId, departmentId, createdBy } = payload;
    
    // Notify supervisors of the department
    const supervisors = await this.prisma.user.findMany({
      where: { departmentId, role: { name: 'SUPERVISOR' }, isActive: true }
    });

    const title = `Tiket Baru: #${ticketNumber}`;
    const message = `Tiket baru #${ticketNumber} telah dibuat di departemen Anda.`;
    const emailSubject = `[HelpDeskPro] Tiket Baru #${ticketNumber}`;
    const emailHtml = `<h1>Tiket Baru</h1><p>${message}</p>`;

    for (const supervisor of supervisors) {
      await this.notifyUser(supervisor.id, NotificationType.TICKET_CREATED, title, message, `${eventId}-${supervisor.id}`, emailHtml, emailSubject);
    }
  }

  private async handleTicketAssigned(payload: any, eventId: string) {
    const { ticketId, ticketNumber, assigneeId, assignedBy } = payload;
    
    const title = `Penugasan Tiket: #${ticketNumber}`;
    const message = `Anda telah ditugaskan untuk menangani tiket #${ticketNumber}.`;
    const emailSubject = `[HelpDeskPro] Penugasan Tiket #${ticketNumber}`;
    const emailHtml = `<h1>Penugasan Tiket</h1><p>${message}</p>`;

    await this.notifyUser(assigneeId, NotificationType.TICKET_ASSIGNED, title, message, eventId, emailHtml, emailSubject);
  }

  private async handleTicketStatusChanged(payload: any, eventId: string) {
    const { ticketId, ticketNumber, status, changedBy } = payload;
    
    const ticket = await this.prisma.ticket.findUnique({ 
      where: { id: ticketId },
      include: { assignments: { where: { isActive: true } } }
    });
    
    if (!ticket) return;

    const title = `Status Tiket Berubah: #${ticketNumber}`;
    const message = `Status tiket #${ticketNumber} berubah menjadi ${status}.`;
    
    // Notify creator
    if (ticket.createdById !== changedBy) {
      await this.notifyUser(ticket.createdById, NotificationType.TICKET_STATUS_CHANGED, title, message, `${eventId}-creator`);
    }

    // Notify assignee
    if (ticket.assignments.length > 0) {
      const assigneeId = ticket.assignments[0].technicianId;
      if (assigneeId !== changedBy) {
        await this.notifyUser(assigneeId, NotificationType.TICKET_STATUS_CHANGED, title, message, `${eventId}-assignee`);
      }
    }
  }

  private async handleTicketResolved(payload: any, eventId: string) {
    const { ticketId, ticketNumber, resolvedBy } = payload;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;

    const title = `Tiket Terselesaikan: #${ticketNumber}`;
    const message = `Tiket #${ticketNumber} telah diselesaikan. Silakan berikan rating Anda.`;
    const emailSubject = `[HelpDeskPro] Tiket Terselesaikan #${ticketNumber}`;
    const emailHtml = `<h1>Tiket Terselesaikan</h1><p>${message}</p>`;

    await this.notifyUser(ticket.createdById, NotificationType.TICKET_RESOLVED, title, message, eventId, emailHtml, emailSubject);
  }

  private async handleTicketClosed(payload: any, eventId: string) {
    const { ticketId, ticketNumber, closedBy } = payload;
    const ticket = await this.prisma.ticket.findUnique({ 
      where: { id: ticketId },
      include: { assignments: { where: { isActive: true } } }
    });
    if (!ticket) return;

    if (ticket.assignments.length > 0) {
      const assigneeId = ticket.assignments[0].technicianId;
      const title = `Tiket Ditutup: #${ticketNumber}`;
      const message = `Tiket #${ticketNumber} telah ditutup oleh pengguna.`;
      
      await this.notifyUser(assigneeId, NotificationType.TICKET_CLOSED, title, message, eventId);
    }
  }

  private async handleTicketRejected(payload: any, eventId: string) {
    const { ticketId, ticketNumber, rejectedBy, reason } = payload;
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;

    const title = `Tiket Ditolak: #${ticketNumber}`;
    const message = `Tiket #${ticketNumber} telah ditolak. Alasan: ${reason || 'Tidak ada'}.`;
    const emailSubject = `[HelpDeskPro] Tiket Ditolak #${ticketNumber}`;
    const emailHtml = `<h1>Tiket Ditolak</h1><p>${message}</p>`;

    await this.notifyUser(ticket.createdById, NotificationType.TICKET_REJECTED, title, message, eventId, emailHtml, emailSubject);
  }

  private async handleTicketCommentAdded(payload: any, eventId: string) {
    // Only notify assignee if creator comments, or creator if assignee comments
    const { ticketId, ticketNumber, authorId, isInternal } = payload;
    const ticket = await this.prisma.ticket.findUnique({ 
      where: { id: ticketId },
      include: { assignments: { where: { isActive: true } } }
    });
    if (!ticket) return;

    const title = `Komentar Baru: #${ticketNumber}`;
    const message = `Ada komentar baru pada tiket #${ticketNumber}.`;
    
    if (isInternal) {
      // Internal comments: maybe notify other technicians/supervisors, skip for now to simplify
      return;
    }

    if (ticket.createdById === authorId && ticket.assignments.length > 0) {
      // User replied -> notify technician
      await this.notifyUser(ticket.assignments[0].technicianId, NotificationType.TICKET_COMMENT_ADDED, title, message, eventId);
    } else if (ticket.createdById !== authorId) {
      // Tech replied -> notify user
      const emailSubject = `[HelpDeskPro] Balasan Tiket #${ticketNumber}`;
      const emailHtml = `<h1>Komentar Baru</h1><p>${message}</p>`;
      await this.notifyUser(ticket.createdById, NotificationType.TICKET_COMMENT_ADDED, title, message, eventId, emailHtml, emailSubject);
    }
  }

  private async handleSlaWarning(payload: any, eventId: string) {
    const { ticketId, ticketNumber, departmentId } = payload;
    const supervisors = await this.prisma.user.findMany({
      where: { departmentId, role: { name: 'SUPERVISOR' }, isActive: true }
    });

    const title = `Peringatan SLA: #${ticketNumber}`;
    const message = `Tiket #${ticketNumber} hampir melewati batas SLA.`;
    const emailSubject = `[HelpDeskPro] Peringatan SLA #${ticketNumber}`;
    const emailHtml = `<h1>Peringatan SLA</h1><p>${message}</p>`;

    for (const supervisor of supervisors) {
      await this.notifyUser(supervisor.id, NotificationType.SLA_WARNING, title, message, `${eventId}-${supervisor.id}`, emailHtml, emailSubject);
    }
  }

  private async handleSlaBreach(payload: any, eventId: string) {
    const { ticketId, ticketNumber, departmentId } = payload;
    const targets = await this.prisma.user.findMany({
      where: { 
        OR: [
          { departmentId, role: { name: 'SUPERVISOR' } },
          { role: { name: 'ADMINISTRATOR' } }
        ],
        isActive: true 
      }
    });

    const title = `Pelanggaran SLA: #${ticketNumber}`;
    const message = `SLA tiket #${ticketNumber} telah terlewati!`;
    const emailSubject = `[HelpDeskPro] Pelanggaran SLA #${ticketNumber}`;
    const emailHtml = `<h1>Pelanggaran SLA</h1><p>${message}</p>`;

    for (const target of targets) {
      await this.notifyUser(target.id, NotificationType.SLA_BREACH, title, message, `${eventId}-${target.id}`, emailHtml, emailSubject);
    }
  }
}
