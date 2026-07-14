import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { TicketStatus, Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  private parseFilter(filter: ReportFilterDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.createdAt.lte = new Date(filter.dateTo);
    }

    if (filter.departmentId) {
      where.category = { departmentId: filter.departmentId };
    }
    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }
    if (filter.priorityId) {
      where.priorityId = filter.priorityId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.technicianId) {
      where.assignments = {
        some: { technicianId: filter.technicianId, isActive: true }
      };
    }

    return where;
  }

  async generateTicketReport(filter: ReportFilterDto): Promise<Buffer> {
    const where = this.parseFilter(filter);

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        priority: true,
        assignments: {
          where: { isActive: true },
          include: { technician: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalTickets = tickets.length;
    let compliantCount = 0;
    
    const reportData = {
      period: `${filter.dateFrom} to ${filter.dateTo}`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTickets,
        slaComplianceRate: 100
      },
      tickets: tickets.map(t => {
        if (!t.isOverdue) compliantCount++;
        const technician = t.assignments[0]?.technician?.name || 'Unassigned';
        return {
          ticketNumber: t.ticketNumber,
          title: t.title,
          priority: t.priority.name,
          status: t.status,
          createdAt: t.createdAt.toISOString().split('T')[0],
          technician
        };
      })
    };

    if (totalTickets > 0) {
      reportData.summary.slaComplianceRate = (compliantCount / totalTickets) * 100;
    }

    if (filter.format === 'pdf') {
      return this.pdfGenerator.generateTicketReportPdf(reportData);
    } else if (filter.format === 'xlsx') {
      return this.excelGenerator.generateTicketReportExcel(reportData);
    }

    throw new BadRequestException('Unsupported format');
  }

  async generateTechnicianPerformanceReport(filter: ReportFilterDto): Promise<Buffer> {
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

      if (assignedTickets.length === 0) continue;

      let resolvedCount = 0;
      let totalResolutionMinutes = 0;
      let totalRating = 0;
      let ratedCount = 0;
      let overdueCount = 0;

      for (const ticket of assignedTickets) {
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
      }

      const slaComplianceRate = assignedTickets.length > 0 
        ? ((assignedTickets.length - overdueCount) / assignedTickets.length) * 100 
        : 100;

      result.push({
        name: tech.name,
        totalTickets: assignedTickets.length,
        resolved: resolvedCount,
        avgResolutionTime: resolvedCount > 0 ? totalResolutionMinutes / resolvedCount : 0,
        avgRating: ratedCount > 0 ? totalRating / ratedCount : 0,
        slaComplianceRate,
      });
    }

    const reportData = {
      period: `${filter.dateFrom} to ${filter.dateTo}`,
      generatedAt: new Date().toISOString(),
      technicians: result
    };

    if (filter.format === 'pdf') {
      return this.pdfGenerator.generateTechnicianReportPdf(reportData);
    } else if (filter.format === 'xlsx') {
      return this.excelGenerator.generateTechnicianReportExcel(reportData);
    }

    throw new BadRequestException('Unsupported format');
  }
}
