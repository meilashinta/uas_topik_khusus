import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService, AuditLogAction } from '../audit-log/audit-log.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentFilterDto } from './dto/department-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filterDto: DepartmentFilterDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', isActive } = filterDto;

    const where: Prisma.DepartmentWhereInput = {};
    
    // Default to true if not specified
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [total, departments] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      data: departments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: { where: { isActive: true } } },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async create(createDto: CreateDepartmentDto, performedByUserId: string, req: any) {
    const existing = await this.prisma.department.findFirst({
      where: {
        code: { equals: createDto.code, mode: 'insensitive' }
      }
    });

    if (existing) {
      throw new ConflictException(`Department code '${createDto.code}' already exists`);
    }

    const newDepartment = await this.prisma.department.create({
      data: {
        name: createDto.name,
        code: createDto.code.toUpperCase(),
      },
    });

    await this.auditLogService.logAction(
      'DEPARTMENT_CREATED',
      'Department',
      newDepartment.id,
      performedByUserId,
      { code: newDepartment.code, name: newDepartment.name },
      req
    );

    return newDepartment;
  }

  async update(id: string, updateDto: UpdateDepartmentDto, performedByUserId: string, req: any) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) throw new NotFoundException('Department not found');

    if (updateDto.code && updateDto.code.toUpperCase() !== department.code) {
      const existing = await this.prisma.department.findFirst({
        where: { code: { equals: updateDto.code, mode: 'insensitive' } }
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Department code '${updateDto.code}' already exists`);
      }
    }

    const dataToUpdate: any = { ...updateDto };
    if (updateDto.code) {
      dataToUpdate.code = updateDto.code.toUpperCase();
    }

    const updatedDepartment = await this.prisma.department.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.auditLogService.logAction(
      'DEPARTMENT_UPDATED',
      'Department',
      updatedDepartment.id,
      performedByUserId,
      updateDto,
      req
    );

    return updatedDepartment;
  }

  async softDelete(id: string, performedByUserId: string, req: any) {
    const department = await this.prisma.department.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { users: { where: { isActive: true } } }
        }
      }
    });

    if (!department) throw new NotFoundException('Department not found');
    if (!department.isActive) throw new BadRequestException('Department is already deactivated');

    // We do NOT block deactivation if there are active users/tickets based on our design decision.
    // We just set isActive = false.

    const deactivatedDepartment = await this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.logAction(
      'DEPARTMENT_DEACTIVATED',
      'Department',
      deactivatedDepartment.id,
      performedByUserId,
      { activeUsersCount: department._count.users },
      req
    );

    return { message: 'Department successfully deactivated' };
  }
}
