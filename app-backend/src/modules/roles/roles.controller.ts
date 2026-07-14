import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('api/v1/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Roles(RoleName.ADMINISTRATOR)
  @Get()
  @ApiOperation({ summary: 'Get list of roles (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return all roles' })
  async findAll() {
    return this.rolesService.findAll();
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Get(':id')
  @ApiOperation({ summary: 'Get role detail (Admin only)' })
  @ApiResponse({ status: 200, description: 'Return role detail and active users count' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }
}
