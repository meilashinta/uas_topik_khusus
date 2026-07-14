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
  @ApiOperation({ summary: 'Get workload of all technicians' })
  @ApiResponse({ status: 200, description: 'Return array of technicians with workload' })
  async getWorkload() {
    return this.usersService.getTechnicianWorkload();
  }

  @Get('ratings')
  @Roles(RoleName.ADMINISTRATOR, RoleName.SUPERVISOR)
  @ApiOperation({ summary: 'Get rating statistics for technicians' })
  async getRatings() {
    return this.usersService.getTechnicianRatings();
  }
}
