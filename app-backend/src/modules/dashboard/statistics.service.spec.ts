import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { TicketStatus } from '@prisma/client';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prismaService: any;
  let redisService: any;
  let cacheService: any;

  beforeEach(async () => {
    prismaService = {
      ticket: {
        groupBy: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      ticketHistory: {
        findMany: jest.fn(),
      }
    };
    
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    cacheService = {
      getOrSet: jest.fn(async (key, ttl, cb) => cb()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisService, useValue: redisService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTicketCountByStatus', () => {
    it('should aggregate counts by status', async () => {
      prismaService.ticket.groupBy.mockResolvedValue([
        { status: TicketStatus.OPEN, _count: { id: 5 } },
        { status: TicketStatus.RESOLVED, _count: { id: 3 } },
      ]);

      const result = await service.getTicketCountByStatus();
      
      expect(result[TicketStatus.OPEN]).toBe(5);
      expect(result[TicketStatus.RESOLVED]).toBe(3);
      expect(result[TicketStatus.CLOSED]).toBe(0);
      expect(prismaService.ticket.groupBy).toHaveBeenCalled();
    });
  });

  describe('getSlaComplianceRate', () => {
    it('should calculate SLA compliance correctly', async () => {
      // Total 10 tickets
      prismaService.ticket.count.mockResolvedValueOnce(10);
      // 2 overdue
      prismaService.ticket.count.mockResolvedValueOnce(2);

      const rate = await service.getSlaComplianceRate();
      expect(rate).toBe(80); // (10-2)/10 * 100
    });

    it('should return 100 if no tickets', async () => {
      prismaService.ticket.count.mockResolvedValueOnce(0);
      const rate = await service.getSlaComplianceRate();
      expect(rate).toBe(100);
    });
  });

  describe('getAverageResolutionTime', () => {
    it('should compute average resolution time in minutes', async () => {
      const now = new Date();
      const resolvedAt1 = new Date(now.getTime() + 60000); // 1 minute
      const resolvedAt2 = new Date(now.getTime() + 180000); // 3 minutes

      prismaService.ticket.findMany.mockResolvedValue([
        { createdAt: now, resolvedAt: resolvedAt1 },
        { createdAt: now, resolvedAt: resolvedAt2 },
      ]);

      const avg = await service.getAverageResolutionTime();
      expect(avg).toBe(2); // (1+3)/2 = 2 minutes
    });
  });
});
