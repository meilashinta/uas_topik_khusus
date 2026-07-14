import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly statisticsService: StatisticsService) {}

  private applyRoleFilter(filterDto: DashboardFilterDto, user: any): DashboardFilterDto {
    const filter = { ...filterDto };
    if (user.role === RoleName.SUPERVISOR) {
      filter.departmentId = user.departmentId;
    } else if (user.role === RoleName.TECHNICIAN) {
      filter.technicianId = user.userId;
    }
    return filter;
  }

  @Get('summary')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  @ApiOperation({ summary: 'Get dashboard summary stats' })
  async getSummary(@Req() req: any, @Query() filterDto: DashboardFilterDto) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    return this.statisticsService.getDashboardSummary(filter);
  }

  @Get('sla-compliance')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Get SLA compliance stats and at-risk tickets' })
  async getSlaCompliance(@Req() req: any, @Query() filterDto: DashboardFilterDto) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    return this.statisticsService.getSlaCompliance(filter);
  }

  @Get('technician-performance')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  @ApiOperation({ summary: 'Get technician performance metrics' })
  async getTechnicianPerformance(@Req() req: any, @Query() filterDto: DashboardFilterDto) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    return this.statisticsService.getTechnicianPerformance(filter);
  }

  @Get('ticket-trend')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Get ticket trend over time' })
  async getTicketTrend(@Req() req: any, @Query() filterDto: DashboardFilterDto) {
    const filter = this.applyRoleFilter(filterDto, req.user);
    return this.statisticsService.getTicketTrend(filter);
  }
}
