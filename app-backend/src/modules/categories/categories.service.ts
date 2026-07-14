import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filterDto: CategoryFilterDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', departmentId, isActive } = filterDto;

    const where: Prisma.TicketCategoryWhereInput = {};
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    const [total, categories] = await Promise.all([
      this.prisma.ticketCategory.count({ where }),
      this.prisma.ticketCategory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          department: { select: { id: true, name: true } },
        }
      }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(createDto: CreateCategoryDto, performedByUserId: string, req: any) {
    if (createDto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: createDto.departmentId } });
      if (!dept || !dept.isActive) {
        throw new BadRequestException('Department is invalid or inactive');
      }
    }

    const newCategory = await this.prisma.ticketCategory.create({
      data: createDto,
    });

    await this.auditLogService.logAction(
      'CATEGORY_CREATED',
      'TicketCategory',
      newCategory.id,
      performedByUserId,
      { name: newCategory.name },
      req
    );

    return newCategory;
  }

  async update(id: string, updateDto: UpdateCategoryDto, performedByUserId: string, req: any) {
    const category = await this.prisma.ticketCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (updateDto.departmentId && updateDto.departmentId !== category.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: updateDto.departmentId } });
      if (!dept || !dept.isActive) {
        throw new BadRequestException('Department is invalid or inactive');
      }
    }

    const updatedCategory = await this.prisma.ticketCategory.update({
      where: { id },
      data: updateDto,
    });

    await this.auditLogService.logAction(
      'CATEGORY_UPDATED',
      'TicketCategory',
      updatedCategory.id,
      performedByUserId,
      updateDto,
      req
    );

    return updatedCategory;
  }

  async softDelete(id: string, performedByUserId: string, req: any) {
    const category = await this.prisma.ticketCategory.findUnique({ 
      where: { id },
      include: { _count: { select: { tickets: true } } }
    });
    
    if (!category) throw new NotFoundException('Category not found');
    if (!category.isActive) throw new BadRequestException('Category is already deactivated');

    const deactivatedCategory = await this.prisma.ticketCategory.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.logAction(
      'CATEGORY_DEACTIVATED',
      'TicketCategory',
      deactivatedCategory.id,
      performedByUserId,
      { activeTicketsCount: category._count.tickets },
      req
    );

    return { message: 'Category successfully deactivated' };
  }
}
