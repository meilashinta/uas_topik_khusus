import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HttpHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  private prisma: PrismaClient;

  constructor(
    private health: HealthCheckService,
    private redisService: RedisService,
    private rabbitMQService: RabbitMQService,
  ) {
    this.prisma = new PrismaClient();
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database (Prisma) connectivity
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          return { database: { status: 'down', error: (error as Error).message } };
        }
      },
      // Redis connectivity
      async () => {
        try {
          await this.redisService.ping();
          return { redis: { status: 'up' } };
        } catch (error) {
          return { redis: { status: 'down', error: (error as Error).message } };
        }
      },
      // RabbitMQ connectivity
      async () => {
        try {
          const isUp = await this.rabbitMQService.ping();
          if (isUp) {
             return { rabbitmq: { status: 'up' } };
          }
          return { rabbitmq: { status: 'down', error: 'Channel closed' } };
        } catch (error) {
          return { rabbitmq: { status: 'down', error: (error as Error).message } };
        }
      },
    ]);
  }

  @Get('ready')
  ready() {
    return { status: 'ready' };
  }
}
