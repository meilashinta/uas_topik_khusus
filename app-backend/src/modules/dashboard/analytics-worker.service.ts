import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AnalyticsWorkerService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsWorkerService.name);

  constructor(
    private readonly rabbitmqService: RabbitMQService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    try {
      await this.rabbitmqService.subscribe('analytics-worker', async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;

        this.logger.log(`Analytics Worker processing event: ${routingKey}`);

        try {
          await this.processEvent(routingKey, event);
        } catch (error) {
          this.logger.error(`Error processing analytics event: ${routingKey}`, error);
          // In a real production system, you'd throw here to NACK and route to DLQ
          // throw error; 
        }
      });
      this.logger.log('Analytics Worker subscribed to analytics-worker queue');
    } catch (error) {
      this.logger.error('Failed to subscribe Analytics Worker', error);
    }
  }

  private async processEvent(routingKey: string, event: any) {
    const ticketId = event.ticketId;
    
    // Always invalidate general dashboard cache
    await this.redisService.delByPattern('dashboard:summary:*');
    
    if (ticketId) {
      await this.redisService.del(`ticket:${ticketId}`);
    }

    switch (routingKey) {
      case 'ticket.created':
        // Wait, Redis doesn't have incrby without a key, we can use incr or let dashboard queries handle it
        break;
        
      case 'ticket.assigned':
        if (event.assignedTo) {
          await this.redisService.del(`technician:stats:${event.assignedTo}`);
        }
        break;
        
      case 'ticket.status_changed':
        // Handled by general cache invalidation
        break;
        
      case 'ticket.resolved':
      case 'ticket.closed':
        if (event.assignedTo) {
          await this.redisService.del(`technician:stats:${event.assignedTo}`);
        }
        break;

      case 'sla.warning':
      case 'sla.breach':
        // SLA caches are updated by the SLA cron, but we can proactively invalidate them here
        await this.redisService.del('sla:overdue:list');
        await this.redisService.del('sla:compliance:rate');
        break;

      default:
        this.logger.debug(`No specific cache logic for event: ${routingKey}`);
        break;
    }
  }
}
