import { Test, TestingModule } from '@nestjs/testing';
import { ActivityWorkerService } from './activity-worker.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

describe('ActivityWorkerService', () => {
  let service: ActivityWorkerService;
  let rabbitmqServiceMock: any;
  let prismaMock: any;

  beforeEach(async () => {
    rabbitmqServiceMock = {
      subscribe: jest.fn(),
    };
    prismaMock = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityWorkerService,
        { provide: RabbitMQService, useValue: rabbitmqServiceMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ActivityWorkerService>(ActivityWorkerService);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should subscribe onModuleInit', async () => {
    rabbitmqServiceMock.subscribe.mockResolvedValue(true);
    await service.onModuleInit();
    jest.advanceTimersByTime(2500);
    expect(rabbitmqServiceMock.subscribe).toHaveBeenCalled();
  });

  it('should handleMessage correctly', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);

    // Empty message
    await expect(handleMessage(null)).resolves.toBeUndefined();

    // Valid message
    const msg = {
      fields: { routingKey: 'ticket.status_changed' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1', oldStatus: 'OPEN', status: 'IN_PROGRESS', changedBy: 'u1' })),
      properties: { messageId: 'm1' },
    };

    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const txMock = {
        activityLog: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
        ticketHistory: { create: jest.fn() }
      };
      await cb(txMock);
      expect(txMock.activityLog.create).toHaveBeenCalled();
      expect(txMock.ticketHistory.create).toHaveBeenCalled();
    });

    await handleMessage(msg);
  });

  it('should skip if activity log already exists', async () => {
    const handleMessage = (service as any).handleMessage.bind(service);
    const msg = {
      fields: { routingKey: 'ticket.status_changed' },
      content: Buffer.from(JSON.stringify({ ticketId: 't1' })),
      properties: { messageId: 'm1' },
    };

    prismaMock.$transaction.mockImplementation(async (cb: any) => {
      const txMock = {
        activityLog: { findUnique: jest.fn().mockResolvedValue({ id: '1' }), create: jest.fn() },
      };
      await cb(txMock);
      expect(txMock.activityLog.create).not.toHaveBeenCalled();
    });

    await handleMessage(msg);
  });
});
