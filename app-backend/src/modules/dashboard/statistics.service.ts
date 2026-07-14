import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { TicketStatus } from '@prisma/client';

export interface TrendData {
  date: string;
  count: number;
}

export interface TechnicianStats {
  resolvedTickets: number;
  averageResolutionTimeMinutes: number;
  averageRating: number;
  overdueTickets: number;
  slaComplianceRate: number;
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly cacheService: CacheService,
  ) {}

  async getTicketCountByStatus(): Promise<Record<TicketStatus, number>> {
    const cacheKey = 'dashboard:summary:ticketCountByStatus';
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const counts = await this.prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true },
      });

      const result = Object.values(TicketStatus).reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<TicketStatus, number>);

      counts.forEach((item) => {
        result[item.status] = item._count.id;
      });

      return result;
    });
  }

  async getSlaComplianceRate(dateRange?: { from: Date; to: Date }): Promise<number> {
    const cacheKey = `dashboard:summary:slaComplianceRate:${dateRange?.from?.toISOString() || 'all'}:${dateRange?.to?.toISOString() || 'all'}`;
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const where: any = {};
      if (dateRange) {
        where.createdAt = { gte: dateRange.from, lte: dateRange.to };
      }

      const totalTickets = await this.prisma.ticket.count({ where });
      if (totalTickets === 0) return 100;

      const overdueTickets = await this.prisma.ticket.count({
        where: { ...where, isOverdue: true },
      });

      const compliantTickets = totalTickets - overdueTickets;
      return (compliantTickets / totalTickets) * 100;
    });
  }

  async getAverageResolutionTime(dateRange?: { from: Date; to: Date }): Promise<number> {
    const cacheKey = `dashboard:summary:avgResolutionTime:${dateRange?.from?.toISOString() || 'all'}:${dateRange?.to?.toISOString() || 'all'}`;
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const where: any = { status: TicketStatus.RESOLVED };
      if (dateRange) {
        where.createdAt = { gte: dateRange.from, lte: dateRange.to };
      }

      const tickets = await this.prisma.ticket.findMany({
        where,
        select: { createdAt: true, resolvedAt: true },
      });

      if (tickets.length === 0) return 0;

      let totalMinutes = 0;
      let validCount = 0;

      for (const ticket of tickets) {
        if (ticket.resolvedAt) {
          const diffMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          totalMinutes += diffMs / 60000;
          validCount++;
        }
      }

      return validCount > 0 ? totalMinutes / validCount : 0;
    });
  }

  async getAverageFirstResponseTime(dateRange?: { from: Date; to: Date }): Promise<number> {
     // A simplified version. Real FRT usually checks the first comment by a technician.
     // For this assignment, we can approximate it as time to get "ASSIGNED" from "OPEN",
     // or time from "OPEN" to first TicketHistory change.
     const cacheKey = `dashboard:summary:avgFrt:${dateRange?.from?.toISOString() || 'all'}:${dateRange?.to?.toISOString() || 'all'}`;
     return this.cacheService.getOrSet(cacheKey, 60, async () => {
        // Query ticket history finding the first transition from OPEN
        const where: any = { fromStatus: TicketStatus.OPEN };
        if (dateRange) {
          where.createdAt = { gte: dateRange.from, lte: dateRange.to };
        }

        const histories = await this.prisma.ticketHistory.findMany({
           where,
           orderBy: { createdAt: 'asc' },
           distinct: ['ticketId'], // take only the first transition per ticket
           include: { ticket: { select: { createdAt: true } } }
        });

        if (histories.length === 0) return 0;

        let totalMinutes = 0;
        for (const history of histories) {
           const diffMs = history.createdAt.getTime() - history.ticket.createdAt.getTime();
           totalMinutes += diffMs / 60000;
        }

        return totalMinutes / histories.length;
     });
  }

  async getTicketTrend(period: 'day' | 'week' | 'month', range: number): Promise<TrendData[]> {
    const cacheKey = `dashboard:summary:trend:${period}:${range}`;
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
       // Ideally we'd use raw SQL for group by day/week/month depending on the DB
       // Here we fetch all within range and group in memory for simplicity/DB-agnostic approach.
       const now = new Date();
       const startDate = new Date();
       if (period === 'day') startDate.setDate(now.getDate() - range);
       if (period === 'week') startDate.setDate(now.getDate() - (range * 7));
       if (period === 'month') startDate.setMonth(now.getMonth() - range);

       const tickets = await this.prisma.ticket.findMany({
         where: { createdAt: { gte: startDate } },
         select: { createdAt: true }
       });

       const countsByDate = new Map<string, number>();
       
       tickets.forEach(ticket => {
          let dateStr = '';
          if (period === 'day' || period === 'week') {
             // Group by YYYY-MM-DD
             dateStr = ticket.createdAt.toISOString().split('T')[0];
          } else {
             // Group by YYYY-MM
             dateStr = ticket.createdAt.toISOString().slice(0, 7);
          }
          countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
       });

       const result: TrendData[] = [];
       countsByDate.forEach((count, date) => {
          result.push({ date, count });
       });

       return result.sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  async getTechnicianStats(technicianId: string): Promise<TechnicianStats> {
    const cacheKey = `technician:stats:${technicianId}`;
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      // Tickets assigned to this technician that are resolved/closed
      const assignedTickets = await this.prisma.ticket.findMany({
        where: {
          assignments: { some: { technicianId } },
        },
        include: {
          rating: true
        }
      });

      let resolvedCount = 0;
      let totalResolutionMinutes = 0;
      let totalRating = 0;
      let ratedCount = 0;
      let overdueCount = 0;

      assignedTickets.forEach(ticket => {
        if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
          resolvedCount++;
          if (ticket.resolvedAt) {
            totalResolutionMinutes += (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000;
          }
        }
        
        if (ticket.rating) {
           totalRating += ticket.rating.score;
           ratedCount++;
        }

        if (ticket.isOverdue) {
           overdueCount++;
        }
      });

      const slaComplianceRate = assignedTickets.length > 0 
          ? ((assignedTickets.length - overdueCount) / assignedTickets.length) * 100 
          : 100;

      return {
        resolvedTickets: resolvedCount,
        averageResolutionTimeMinutes: resolvedCount > 0 ? totalResolutionMinutes / resolvedCount : 0,
        averageRating: ratedCount > 0 ? totalRating / ratedCount : 0,
        overdueTickets: overdueCount,
        slaComplianceRate
      };
    });
  }
}
