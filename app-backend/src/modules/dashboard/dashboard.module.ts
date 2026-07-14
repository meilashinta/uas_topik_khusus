import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { StatisticsService } from './statistics.service';
import { AnalyticsWorkerService } from './analytics-worker.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { RabbitMQModule } from '../../infrastructure/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RedisModule, RabbitMQModule],
  controllers: [DashboardController],
  providers: [StatisticsService, AnalyticsWorkerService],
  exports: [StatisticsService]
})
export class DashboardModule {}
