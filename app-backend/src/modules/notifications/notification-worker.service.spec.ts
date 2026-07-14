import { Test, TestingModule } from '@nestjs/testing';
import { NotificationWorkerService } from './notification-worker.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('NotificationWorkerService', () => {
  let service: NotificationWorkerService;
  let rabbitmqServiceMock: any;
  let notificationsServiceMock: any;
  let emailServiceMock: any;
  let prismaMock: any;

  beforeEach(async () => {
    rabbitmqServiceMock = { subscribe: jest.fn() };
    notificationsServiceMock = { createNotification: jest.fn() };
    emailServiceMock = { sendEmail: jest.fn().mockResolvedValue({}) };
    prismaMock = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      ticket: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationWorkerService,
        { provide: RabbitMQService, useValue: rabbitmqServiceMock },
        { provide: NotificationsService, useValue: notificationsServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NotificationWorkerService>(NotificationWorkerService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle ticket.created correctly', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    
    const msg = {
      fields: { routingKey: 'ticket.created' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1', ticketNumber: 'TKT-1', departmentId: 'd1', createdBy: 'u1' })),
      properties: { messageId: 'm1' },
    };

    prismaMock.user.findMany.mockResolvedValue([
      { id: 'sup1', emailNotificationEnabled: true, email: 'sup1@example.com' }
    ]);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'sup1', emailNotificationEnabled: true, email: 'sup1@example.com' });

    await handleMessage(msg);
    expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
  });

  it('should handle ticket.assigned correctly', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    
    const msg = {
      fields: { routingKey: 'ticket.assigned' },
      content: Buffer.from(JSON.stringify({ ticketNumber: 'TKT-1', assigneeId: 'u2', assignedBy: 'u1' })),
      properties: { messageId: 'm1' },
    };

    prismaMock.user.findUnique.mockResolvedValue({ id: 'u2', emailNotificationEnabled: true, email: 'u2@example.com' });

    await handleMessage(msg);
    expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
  });

  it('should handle ticket.status_changed correctly', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    
    const msg = {
      fields: { routingKey: 'ticket.status_changed' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1', ticketNumber: 'TKT-1', status: 'IN_PROGRESS', changedBy: 'u3' })),
      properties: { messageId: 'm1' },
    };

    prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', assignments: [{ technician: { id: 'u2' } }] });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', emailNotificationEnabled: true, email: 'u1@example.com' });

    await handleMessage(msg);
    expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
  });

  it('should handle ticket.comment_added correctly', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    
    const msg = {
      fields: { routingKey: 'ticket.comment_added' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1', ticketNumber: 'TKT-1', authorId: 'u3', isInternal: false })),
      properties: { messageId: 'm1' },
    };

    prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', assignments: [{ technician: { id: 'u2' } }] });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', emailNotificationEnabled: true, email: 'u1@example.com' });

    await handleMessage(msg);
    expect(notificationsServiceMock.createNotification).toHaveBeenCalled();
  });

  it('should handle other ticket events', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    const events = ['ticket.resolved', 'ticket.closed', 'ticket.rejected', 'sla.warning', 'sla.breach'];
    
    for (const event of events) {
      const msg = {
        fields: { routingKey: event },
        content: Buffer.from(JSON.stringify({ ticketId: 't1', ticketNumber: 'TKT-1', resolvedBy: 'u1', closedBy: 'u1', rejectedBy: 'u1', assigneeId: 'u1' })),
        properties: { messageId: 'm1' },
      };
      prismaMock.ticket.findUnique.mockResolvedValue({ id: 't1', createdById: 'u1', assignments: [{ technician: { id: 'u2' } }] });
      prismaMock.user.findMany.mockResolvedValue([{ id: 'sup1' }]);
      await handleMessage(msg);
    }
  });

  it('should skip null messages', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    await expect(handleMessage(null)).resolves.toBeUndefined();
  });

  it('should log warning for unhandled routing keys', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    
    const msg = {
      fields: { routingKey: 'ticket.unknown' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1' })),
      properties: { messageId: 'm1' },
    };

    await expect(handleMessage(msg)).resolves.toBeUndefined();
  });
});
