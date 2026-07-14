import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(RoleName.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get audit logs with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Return paginated audit logs' })
  async findAll(@Query() filters: AuditLogFilterDto) {
    return this.auditLogService.findAll(filters);
  }

  @Get(':id')
  @Roles(RoleName.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get details of a specific audit log' })
  @ApiResponse({ status: 200, description: 'Return audit log details' })
  async findOne(@Param('id') id: string) {
    return this.auditLogService.findOne(id);
  }
}

