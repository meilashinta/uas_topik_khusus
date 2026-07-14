import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsWorkerService } from './analytics-worker.service';
import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

describe('AnalyticsWorkerService', () => {
  let service: AnalyticsWorkerService;
  let rabbitmqService: any;
  let redisService: any;

  beforeEach(async () => {
    rabbitmqService = {
      subscribe: jest.fn(),
    };
    redisService = {
      delByPattern: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsWorkerService,
        { provide: RabbitMQService, useValue: rabbitmqService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AnalyticsWorkerService>(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processEvent', () => {
    it('should invalidate dashboard summary cache for any event', async () => {
      await (service as any).processEvent('ticket.created', { ticketId: '123' });
      expect(redisService.delByPattern).toHaveBeenCalledWith('dashboard:summary:*');
      expect(redisService.del).toHaveBeenCalledWith('ticket:123');
    });

    it('should delete technician stats cache for assignment events', async () => {
      await (service as any).processEvent('ticket.assigned', { ticketId: '123', assignedTo: 'tech-1' });
      expect(redisService.del).toHaveBeenCalledWith('technician:stats:tech-1');
    });
    
    it('should handle resolved and closed events', async () => {
      await (service as any).processEvent('ticket.resolved', { ticketId: '123', assignedTo: 'tech-2' });
      expect(redisService.del).toHaveBeenCalledWith('technician:stats:tech-2');
      
      await (service as any).processEvent('ticket.closed', { ticketId: '124', assignedTo: 'tech-3' });
      expect(redisService.del).toHaveBeenCalledWith('technician:stats:tech-3');
    });
    
    it('should invalidate SLA caches on sla breach and warning', async () => {
      await (service as any).processEvent('sla.breach', { ticketId: '123' });
      expect(redisService.del).toHaveBeenCalledWith('sla:overdue:list');
      expect(redisService.del).toHaveBeenCalledWith('sla:compliance:rate');
      
      await (service as any).processEvent('sla.warning', { ticketId: '124' });
      expect(redisService.del).toHaveBeenCalledWith('sla:overdue:list');
    });

    it('should handle unknown events gracefully', async () => {
      await (service as any).processEvent('unknown.event', { ticketId: '123' });
      expect(redisService.delByPattern).toHaveBeenCalledWith('dashboard:summary:*');
    });
  });

  describe('onModuleInit', () => {
    it('should subscribe successfully', async () => {
      await service.onModuleInit();
      expect(rabbitmqService.subscribe).toHaveBeenCalled();
    });

    it('should handle errors in subscription', async () => {
      rabbitmqService.subscribe.mockRejectedValue(new Error('fail'));
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should process messages correctly in subscription callback', async () => {
      rabbitmqService.subscribe.mockImplementation(async (queue: any, cb: any) => {
        await cb(null); // Should handle null
        await cb({ fields: { routingKey: 'ticket.created' }, content: Buffer.from('{}') });
      });
      await service.onModuleInit();
      expect(redisService.delByPattern).toHaveBeenCalled();
    });
  });
});
