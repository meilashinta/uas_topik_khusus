import { Test, TestingModule } from '@nestjs/testing';
import { NotificationWorkerService } from './notification-worker.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('NotificationWorkerService', () => {
  let service: NotificationWorkerService;
  let rabbitmqMock: any;
  let notifMock: any;
  let emailMock: any;
  let prismaMock: any;

  beforeEach(async () => {
    rabbitmqMock = { subscribe: jest.fn().mockResolvedValue(true) };
    notifMock = { createNotification: jest.fn() };
    emailMock = { sendEmail: jest.fn().mockResolvedValue(true) };
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      ticket: {
        findUnique: jest.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationWorkerService,
        { provide: RabbitMQService, useValue: rabbitmqMock },
        { provide: NotificationsService, useValue: notifMock },
        { provide: EmailService, useValue: emailMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NotificationWorkerService>(NotificationWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Simplified test just to cover logic block since mostly handler switches
  it('should initialize and subscribe to queue', async () => {
    jest.useFakeTimers();
    await service.onModuleInit();
    jest.advanceTimersByTime(2500);
    expect(rabbitmqMock.subscribe).toHaveBeenCalledWith('notification-worker', expect.any(Function));
    jest.useRealTimers();
  });
});
