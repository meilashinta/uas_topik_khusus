import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CacheService } from '../../infrastructure/redis/cache.service';
import { TicketStatus, Prisma } from '@prisma/client';
import { DashboardFilterDto, DashboardPeriod } from './dto/dashboard-filter.dto';

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  private parseFilter(filter: DashboardFilterDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (filter.departmentId) {
      where.category = { departmentId: filter.departmentId };
    }

    if (filter.technicianId) {
      where.assignments = {
        some: { technicianId: filter.technicianId, isActive: true }
      };
    }

    if (filter.period) {
      const now = new Date();
      let startDate = new Date();
      
      switch (filter.period) {
        case DashboardPeriod.TODAY:
          startDate.setHours(0, 0, 0, 0);
          where.createdAt = { gte: startDate };
          break;
        case DashboardPeriod.WEEK:
          startDate.setDate(now.getDate() - 7);
          where.createdAt = { gte: startDate };
          break;
        case DashboardPeriod.MONTH:
          startDate.setMonth(now.getMonth() - 1);
          where.createdAt = { gte: startDate };
          break;
        case DashboardPeriod.CUSTOM:
          if (filter.dateFrom || filter.dateTo) {
            where.createdAt = {};
            if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
            if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
          }
          break;
      }
    }

    return where;
  }

  private generateCacheKey(prefix: string, filter: DashboardFilterDto): string {
    return `${prefix}:${filter.period || 'all'}:${filter.dateFrom || 'all'}:${filter.dateTo || 'all'}:${filter.departmentId || 'all'}:${filter.technicianId || 'all'}`;
  }

  async getDashboardSummary(filter: DashboardFilterDto) {
    const cacheKey = this.generateCacheKey('dashboard:summary', filter);
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const where = this.parseFilter(filter);

      const totalTickets = await this.prisma.ticket.count({ where });
      
      const countsByStatus = await this.prisma.ticket.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      });

      const ticketsByStatus = Object.values(TicketStatus).reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<TicketStatus, number>);

      countsByStatus.forEach(item => {
        ticketsByStatus[item.status] = item._count.id;
      });

      const overdueTickets = await this.prisma.ticket.count({
        where: { ...where, isOverdue: true }
      });

      // Calculate time metrics
      const resolvedTickets = await this.prisma.ticket.findMany({
        where: { ...where, status: TicketStatus.RESOLVED },
        select: { createdAt: true, resolvedAt: true }
      });

      let totalResolutionMinutes = 0;
      let validResolutionCount = 0;
      for (const t of resolvedTickets) {
        if (t.resolvedAt) {
          totalResolutionMinutes += (t.resolvedAt.getTime() - t.createdAt.getTime()) / 60000;
          validResolutionCount++;
        }
      }

      // First response time (simplified)
      const histories = await this.prisma.ticketHistory.findMany({
         where: { ticket: where, fromStatus: TicketStatus.OPEN },
         orderBy: { createdAt: 'asc' },
         distinct: ['ticketId'],
         include: { ticket: { select: { createdAt: true } } }
      });

      let totalFrtMinutes = 0;
      for (const h of histories) {
         totalFrtMinutes += (h.createdAt.getTime() - h.ticket.createdAt.getTime()) / 60000;
      }

      // Quick counts for today/week/month
      const now = new Date();
      const today = new Date(now); today.setHours(0,0,0,0);
      const week = new Date(now); week.setDate(now.getDate() - 7);
      const month = new Date(now); month.setMonth(now.getMonth() - 1);

      const [ticketsToday, ticketsThisWeek, ticketsThisMonth] = await Promise.all([
        this.prisma.ticket.count({ where: { ...where, createdAt: { gte: today } } }),
        this.prisma.ticket.count({ where: { ...where, createdAt: { gte: week } } }),
        this.prisma.ticket.count({ where: { ...where, createdAt: { gte: month } } }),
      ]);

      return {
        totalTickets,
        ticketsByStatus,
        ticketsToday,
        ticketsThisWeek,
        ticketsThisMonth,
        overdueTickets,
        averageResolutionTimeMinutes: validResolutionCount > 0 ? totalResolutionMinutes / validResolutionCount : 0,
        averageFirstResponseTimeMinutes: histories.length > 0 ? totalFrtMinutes / histories.length : 0,
      };
    });
  }

  async getSlaCompliance(filter: DashboardFilterDto) {
    const cacheKey = this.generateCacheKey('dashboard:sla', filter);
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      const where = this.parseFilter(filter);

      const tickets = await this.prisma.ticket.findMany({
        where,
        include: { priority: true, category: true }
      });

      let totalTickets = 0;
      let totalCompliant = 0;
      const complianceByPriority: Record<string, { total: number; withinSla: number; rate: number }> = {};
      const overdueList: any[] = [];
      const atRiskList: any[] = [];

      for (const ticket of tickets) {
        totalTickets++;
        const pName = ticket.priority.name;
        if (!complianceByPriority[pName]) {
          complianceByPriority[pName] = { total: 0, withinSla: 0, rate: 0 };
        }
        
        complianceByPriority[pName].total++;

        if (!ticket.isOverdue) {
          totalCompliant++;
          complianceByPriority[pName].withinSla++;
        } else {
          overdueList.push({
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            slaDueAt: ticket.slaDueAt,
            priority: ticket.priority.name
          });
        }

        // At risk check (<= 20% time remaining)
        if (!ticket.isOverdue && ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED && ticket.slaDueAt) {
          const remainingMs = ticket.slaDueAt.getTime() - Date.now();
          const totalMs = ticket.priority.slaResolutionMinutes * 60000;
          if (remainingMs > 0 && (remainingMs / totalMs) <= 0.2) {
            atRiskList.push({
              id: ticket.id,
              ticketNumber: ticket.ticketNumber,
              title: ticket.title,
              slaDueAt: ticket.slaDueAt,
              priority: ticket.priority.name,
              remainingMinutes: Math.round(remainingMs / 60000)
            });
          }
        }
      }

      for (const key in complianceByPriority) {
        const stats = complianceByPriority[key];
        stats.rate = stats.total > 0 ? (stats.withinSla / stats.total) * 100 : 100;
      }

      return {
        overallComplianceRate: totalTickets > 0 ? (totalCompliant / totalTickets) * 100 : 100,
        complianceByPriority,
        overdueTickets: overdueList.slice(0, 50), // limit for dashboard
        atRiskTickets: atRiskList.slice(0, 50),
      };
    });
  }

  async getTechnicianPerformance(filter: DashboardFilterDto) {
    const cacheKey = this.generateCacheKey('dashboard:technicians', filter);
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
      // Base where clause for assignments
      let whereAssignment: Prisma.AssignmentWhereInput = {};
      if (filter.technicianId) {
        whereAssignment.technicianId = filter.technicianId;
      }

      // Base where clause for tickets
      const whereTicket = this.parseFilter(filter);

      const technicians = await this.prisma.user.findMany({
        where: {
          role: { name: 'TECHNICIAN' },
          id: filter.technicianId ? filter.technicianId : undefined,
        },
        select: { id: true, name: true }
      });

      const result = [];

      for (const tech of technicians) {
        const assignedTickets = await this.prisma.ticket.findMany({
          where: {
            ...whereTicket,
            assignments: { some: { technicianId: tech.id, isActive: true } }
          },
          include: { rating: true }
        });

        let activeCount = 0;
        let resolvedCount = 0;
        let totalResolutionMinutes = 0;
        let totalRating = 0;
        let ratedCount = 0;
        let overdueCount = 0;

        for (const ticket of assignedTickets) {
          if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
            activeCount++;
          } else {
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
        }

        const slaComplianceRate = assignedTickets.length > 0 
          ? ((assignedTickets.length - overdueCount) / assignedTickets.length) * 100 
          : 100;

        // Only include if they have tickets OR if a specific technician was requested
        if (assignedTickets.length > 0 || filter.technicianId) {
          result.push({
            id: tech.id,
            name: tech.name,
            totalTicketsHandled: assignedTickets.length,
            totalTicketsActive: activeCount,
            averageResolutionTimeMinutes: resolvedCount > 0 ? totalResolutionMinutes / resolvedCount : 0,
            averageRating: ratedCount > 0 ? totalRating / ratedCount : 0,
            totalRatings: ratedCount,
            slaComplianceRate,
            ticketsOverdue: overdueCount,
          });
        }
      }

      return { technicians: result };
    });
  }

  async getTicketTrend(filter: DashboardFilterDto) {
    const cacheKey = this.generateCacheKey('dashboard:trend', filter);
    return this.cacheService.getOrSet(cacheKey, 60, async () => {
       const period = filter.period && filter.period !== DashboardPeriod.CUSTOM ? filter.period : DashboardPeriod.MONTH;
       const range = 30; // default range

       const now = new Date();
       const startDate = new Date();
       if (period === 'today') startDate.setDate(now.getDate() - range); // Day trend for last 30 days
       if (period === 'week') startDate.setDate(now.getDate() - (range * 7));
       if (period === 'month') startDate.setMonth(now.getMonth() - range);

       const where = this.parseFilter(filter);
       if (!where.createdAt) {
         where.createdAt = { gte: startDate };
       }

       const tickets = await this.prisma.ticket.findMany({
         where,
         select: { createdAt: true, status: true }
       });

       const dataMap = new Map<string, { created: number, resolved: number, closed: number }>();
       
       tickets.forEach(ticket => {
          let dateStr = '';
          if (period === DashboardPeriod.TODAY || period === DashboardPeriod.WEEK) {
             // Group by YYYY-MM-DD
             dateStr = ticket.createdAt.toISOString().split('T')[0];
          } else {
             // Group by YYYY-MM
             dateStr = ticket.createdAt.toISOString().slice(0, 7);
          }
          
          if (!dataMap.has(dateStr)) {
            dataMap.set(dateStr, { created: 0, resolved: 0, closed: 0 });
          }
          const item = dataMap.get(dateStr)!;
          item.created++;
          if (ticket.status === TicketStatus.RESOLVED) item.resolved++;
          if (ticket.status === TicketStatus.CLOSED) item.closed++;
       });

       const result: { date: string, created: number, resolved: number, closed: number }[] = [];
       dataMap.forEach((stats, date) => {
          result.push({ date, ...stats });
       });

       return {
         period,
         data: result.sort((a, b) => a.date.localeCompare(b.date))
       };
    });
  }
}
