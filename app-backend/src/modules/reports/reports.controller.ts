import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import type { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private applyRoleFilter(filterDto: ReportFilterDto, user: any): ReportFilterDto {
    const filter = { ...filterDto };
    if (user.role === RoleName.SUPERVISOR) {
      filter.departmentId = user.departmentId;
    }
    return filter;
  }

  @Get('tickets')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Generate Ticket Report' })
  @ApiProduces('application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateTicketReport(
    @Req() req: any, 
    @Query() filterDto: ReportFilterDto, 
    @Res() res: Response
  ) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    const buffer = await this.reportsService.generateTicketReport(filter);

    const filename = `ticket-report-${new Date().toISOString().split('T')[0]}.${filter.format}`;
    const contentType = filter.format === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('technician-performance')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Generate Technician Performance Report' })
  @ApiProduces('application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateTechnicianPerformanceReport(
    @Req() req: any, 
    @Query() filterDto: ReportFilterDto, 
    @Res() res: Response
  ) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    const buffer = await this.reportsService.generateTechnicianPerformanceReport(filter);

    const filename = `technician-report-${new Date().toISOString().split('T')[0]}.${filter.format}`;
    const contentType = filter.format === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
