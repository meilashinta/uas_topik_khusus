import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrioritiesService } from './priorities.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Priorities/SLA')
@ApiBearerAuth()
@Controller('api/v1/priorities')
export class PrioritiesController {
  constructor(private readonly prioritiesService: PrioritiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of all priorities (Available to all roles)' })
  @ApiResponse({ status: 200, description: 'Return all priorities and SLA times' })
  async findAll() {
    return this.prioritiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get priority detail' })
  @ApiResponse({ status: 200, description: 'Return priority detail' })
  async findOne(@Param('id') id: string) {
    return this.prioritiesService.findOne(id);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Post()
  @ApiOperation({ summary: 'Create new priority (Admin only)' })
  @ApiResponse({ status: 201, description: 'Priority created successfully' })
  async create(@Req() req: any, @Body() createPriorityDto: CreatePriorityDto) {
    return this.prioritiesService.create(createPriorityDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update priority SLA time (Admin only)' })
  @ApiResponse({ status: 200, description: 'Priority SLA updated successfully' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updatePriorityDto: UpdatePriorityDto) {
    return this.prioritiesService.update(id, updatePriorityDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate priority (Admin only)' })
  @ApiResponse({ status: 200, description: 'Priority deactivated successfully' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.prioritiesService.softDelete(id, req.user.userId, req);
  }
}
