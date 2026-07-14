import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { DashboardFilterDto, DashboardPeriod } from './dto/dashboard-filter.dto';
import { TicketStatus } from '@prisma/client';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prismaService: any;
  let cacheService: any;

  beforeEach(async () => {
    prismaService = {
      ticket: {
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ticketHistory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      }
    };
    
    cacheService = {
      getOrSet: jest.fn(async (key, ttl, cb) => cb()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('should aggregate counts correctly', async () => {
      prismaService.ticket.groupBy.mockResolvedValue([
        { status: TicketStatus.OPEN, _count: { id: 5 } },
        { status: TicketStatus.RESOLVED, _count: { id: 3 } },
      ]);

      const result = await service.getDashboardSummary(new DashboardFilterDto());
      
      expect(result.totalTickets).toBe(10);
      expect(result.ticketsByStatus[TicketStatus.OPEN]).toBe(5);
      expect(result.ticketsByStatus[TicketStatus.RESOLVED]).toBe(3);
    });
    it('should parse filters correctly for various periods', async () => {
      const periods = [DashboardPeriod.TODAY, DashboardPeriod.WEEK, DashboardPeriod.MONTH, DashboardPeriod.CUSTOM];
      for (const p of periods) {
        const filter = new DashboardFilterDto();
        filter.period = p;
        filter.departmentId = 'd1';
        filter.technicianId = 't1';
        if (p === DashboardPeriod.CUSTOM) {
          filter.dateFrom = '2023-01-01';
          filter.dateTo = '2023-01-31';
        }
        await service.getDashboardSummary(filter);
      }
      expect(prismaService.ticket.count).toHaveBeenCalled();
    });
  });

  describe('getSlaCompliance', () => {
    it('should calculate SLA compliance correctly', async () => {
      // Return 2 tickets, one overdue, one not
      prismaService.ticket.findMany.mockResolvedValue([
        { id: '1', priority: { name: 'HIGH' }, isOverdue: false, status: TicketStatus.CLOSED },
        { id: '2', priority: { name: 'HIGH' }, isOverdue: true, status: TicketStatus.CLOSED },
      ]);

      const result = await service.getSlaCompliance(new DashboardFilterDto());
      expect(result.overallComplianceRate).toBe(50);
      expect(result.complianceByPriority['HIGH'].rate).toBe(50);
      expect(result.overdueTickets.length).toBe(1);
    });
  });

  describe('getTechnicianPerformance', () => {
    it('should calculate technician metrics correctly', async () => {
      prismaService.user.findMany.mockResolvedValue([{ id: 'tech-1', name: 'Tech 1' }]);
      prismaService.ticket.findMany.mockResolvedValue([
        { id: '1', status: TicketStatus.RESOLVED, isOverdue: false, createdAt: new Date(Date.now() - 60000), resolvedAt: new Date(), rating: { score: 5 } },
      ]);

      const result = await service.getTechnicianPerformance(new DashboardFilterDto());
      expect(result.technicians.length).toBe(1);
      expect(result.technicians[0].totalTicketsHandled).toBe(1);
      expect(result.technicians[0].averageRating).toBe(5);
    });
  });
});
