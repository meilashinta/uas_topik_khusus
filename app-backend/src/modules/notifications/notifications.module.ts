import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationWorkerService } from './notification-worker.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationWorkerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
