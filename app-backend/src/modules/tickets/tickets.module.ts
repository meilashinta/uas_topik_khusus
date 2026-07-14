import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { TicketNumberGenerator } from './utils/ticket-number.generator';
import { TicketStateMachineService } from './utils/ticket-state-machine.service';
import { SlaService } from './utils/sla.service';
import { SlaCronService } from './utils/sla.cron';

@Module({
  imports: [PrismaModule, AuditLogModule, RabbitMQModule, RedisModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketNumberGenerator,
    TicketStateMachineService,
    SlaService,
    SlaCronService,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
