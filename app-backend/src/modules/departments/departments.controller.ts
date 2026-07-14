import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentFilterDto } from './dto/department-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('api/v1/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of departments (Available to all roles)' })
  @ApiResponse({ status: 200, description: 'Return list of departments' })
  async findAll(@Query() filterDto: DepartmentFilterDto) {
    return this.departmentsService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department detail' })
  @ApiResponse({ status: 200, description: 'Return department detail' })
  @ApiResponse({ status: 404, description: 'Department not found' })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Post()
  @ApiOperation({ summary: 'Create new department (Admin only)' })
  @ApiResponse({ status: 201, description: 'Department created successfully' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  async create(@Req() req: any, @Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update department (Admin only)' })
  @ApiResponse({ status: 200, description: 'Department updated successfully' })
  @ApiResponse({ status: 409, description: 'Department code already exists' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, updateDepartmentDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate department (Admin only)' })
  @ApiResponse({ status: 200, description: 'Department deactivated successfully' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.departmentsService.softDelete(id, req.user.userId, req);
  }
}
