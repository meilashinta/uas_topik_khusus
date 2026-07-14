import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationType } from './notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(userId: string, type: NotificationType, title: string, message: string, eventId?: string) {
    if (eventId) {
      const existing = await this.prisma.notification.findUnique({ where: { eventId } });
      if (existing) return existing; // Idempotent
    }
    return this.prisma.notification.create({
      data: { userId, type, title, message, eventId },
    });
  }

  async createBulkNotifications(userIds: string[], type: NotificationType, title: string, message: string, eventId?: string) {
    if (eventId) {
      const existing = await this.prisma.notification.findUnique({ where: { eventId } });
      if (existing) return; // Idempotent
    }
    
    // Instead of createMany which cannot return id, we create individually to get idempotency if we wanted, 
    // but Prisma createMany doesn't support returning created records in some adapters.
    // For simplicity, we just use createMany. We use eventId with a unique suffix for bulk
    const data = userIds.map((userId, index) => ({
      userId, type, title, message, eventId: eventId ? `${eventId}-${index}` : undefined
    }));
    
    if (data.length > 0) {
      await this.prisma.notification.createMany({ data, skipDuplicates: true });
    }
  }

  async getUserNotifications(userId: string, isRead?: boolean, type?: string, page = 1, limit = 10) {
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (type) where.type = type;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, meta: { total, page, limit, unreadCount } };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new NotFoundException('Notification not found'); // Hide existence

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
