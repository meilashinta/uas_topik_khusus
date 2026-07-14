import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Technicians')
@ApiBearerAuth()
@Controller('api/v1/technicians')
@UseGuards(RolesGuard)
export class TechniciansController {
  constructor(private readonly usersService: UsersService) {}

  @Get('workload')
  @Roles(RoleName.SUPERVISOR, RoleName.ADMINISTRATOR)
  @ApiOperation({ summary: 'Get workload of all technicians (Active tickets & Resolved today)' })
  @ApiResponse({ status: 200, description: 'Return list of technicians with workload data' })
  async getWorkload() {
    return this.usersService.getTechnicianWorkload();
  }
}
