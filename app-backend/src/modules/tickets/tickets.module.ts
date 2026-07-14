import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { TicketNumberGenerator } from './utils/ticket-number.generator';

@Module({
  imports: [PrismaModule, AuditLogModule, RabbitMQModule, RedisModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketNumberGenerator],
  exports: [TicketsService],
})
export class TicketsModule {}
