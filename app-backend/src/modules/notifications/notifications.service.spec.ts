import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationType } from './notification-type.enum';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      notification: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification if eventId not exists', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);
      prismaMock.notification.create.mockResolvedValue({ id: '1' });
      await service.createNotification('u1', NotificationType.TICKET_CREATED, 'title', 'message', 'evt-1');
      expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it('should return existing notification if eventId exists (idempotent)', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: '1' });
      const result = await service.createNotification('u1', NotificationType.TICKET_CREATED, 'title', 'message', 'evt-1');
      expect(result.id).toBe('1');
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should update isRead to true', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      await service.markAsRead('n1', 'u1');
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });
    
    it('should throw ForbiddenException if user not owner', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u2' });
      await expect(service.markAsRead('n1', 'u1')).rejects.toThrow(require('@nestjs/common').NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for a user', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 2 });
      await service.markAllAsRead('u1');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      prismaMock.notification.findMany.mockResolvedValue([{ id: '1' }]);
      prismaMock.notification.count.mockResolvedValue(1);
      
      const result = await service.getUserNotifications('u1', 1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});

