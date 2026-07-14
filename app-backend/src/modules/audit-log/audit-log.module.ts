import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { ActivityWorkerService } from './activity-worker.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitMQModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, ActivityWorkerService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
