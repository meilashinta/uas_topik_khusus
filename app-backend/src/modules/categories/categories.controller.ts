import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of categories (Available to all roles)' })
  @ApiResponse({ status: 200, description: 'Return list of categories' })
  async findAll(@Query() filterDto: CategoryFilterDto) {
    return this.categoriesService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category detail' })
  @ApiResponse({ status: 200, description: 'Return category detail' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Post()
  @ApiOperation({ summary: 'Create new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(@Req() req: any, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Patch(':id')
  @ApiOperation({ summary: 'Update category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto, req.user.userId, req);
  }

  @Roles(RoleName.ADMINISTRATOR)
  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category deactivated successfully' })
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.categoriesService.softDelete(id, req.user.userId, req);
  }
}
