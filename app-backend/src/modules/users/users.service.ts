import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { EmailService } from '../email/email.service';
import { AuditLogService, AuditLogAction } from '../audit-log/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filterDto: UserFilterDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', roleId, departmentId, isActive, search } = filterDto;

    const where: Prisma.UserWhereInput = {};
    if (roleId) where.roleId = roleId;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    // Check cache first
    const cachedUser = await this.redisService.get(`user:${id}`);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Set cache (TTL 1 hour)
    await this.redisService.set(`user:${id}`, JSON.stringify(user), 3600);

    return user;
  }

  async create(createDto: CreateUserDto, performedByUserId: string, req: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: createDto.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const role = await this.prisma.role.findUnique({ where: { id: createDto.roleId } });
    if (!role) throw new BadRequestException('Role not found');

    const dept = await this.prisma.department.findUnique({ where: { id: createDto.departmentId } });
    if (!dept || !dept.isActive) throw new BadRequestException('Department not found or inactive');

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        ...createDto,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.auditLogService.logAction(
      AuditLogAction.USER_CREATED,
      'User',
      newUser.id,
      performedByUserId,
      { email: newUser.email, roleId: newUser.role.id },
      req
    );

    return newUser;
  }

  async update(id: string, updateDto: UpdateUserDto, performedByUserId: string, req: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    let action = AuditLogAction.USER_UPDATED;

    if (updateDto.roleId && updateDto.roleId !== user.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: updateDto.roleId } });
      if (!role) throw new BadRequestException('Role not found');
      action = AuditLogAction.USER_ROLE_CHANGED;
    }

    if (updateDto.departmentId && updateDto.departmentId !== user.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: updateDto.departmentId } });
      if (!dept || !dept.isActive) throw new BadRequestException('Department not found or inactive');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.redisService.del(`user:${id}`);

    await this.auditLogService.logAction(
      action,
      'User',
      updatedUser.id,
      performedByUserId,
      updateDto,
      req
    );

    return updatedUser;
  }

  async softDelete(id: string, performedByUserId: string, req: any) {
    if (id === performedByUserId) {
      throw new ForbiddenException('Admin cannot deactivate their own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new BadRequestException('User is already deactivated');

    const deactivatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true },
    });

    await this.redisService.del(`user:${id}`);
    
    // In future: invalidate all session tokens / refresh tokens by storing token versions
    // We can just invalidate using a pattern if we stored tokens per user

    await this.auditLogService.logAction(
      AuditLogAction.USER_DEACTIVATED,
      'User',
      deactivatedUser.id,
      performedByUserId,
      {},
      req
    );

    return { message: 'User successfully deactivated' };
  }

  async resetPasswordByAdmin(id: string, performedByUserId: string, req: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const resetToken = crypto.randomUUID();
    await this.redisService.set(`reset:${resetToken}`, user.id, 24 * 60 * 60); // 24 hours for admin reset

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    await this.emailService.sendResetPasswordEmail(user.email, resetLink);

    await this.auditLogService.logAction(
      AuditLogAction.USER_PASSWORD_RESET,
      'User',
      user.id,
      performedByUserId,
      { type: 'ADMIN_INITIATED' },
      req
    );

    return { message: 'Reset password link sent to user email' };
  }

  async getTechnicianWorkload() {
    // Return list of all technicians with their active tickets count and today's resolved tickets
    const technicians = await this.prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' }, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            assignments: {
              where: {
                isActive: true,
                ticket: {
                  status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
                }
              }
            }
          }
        }
      }
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayResolved = await this.prisma.ticketHistory.groupBy({
      by: ['changedById'],
      where: {
        toStatus: 'RESOLVED',
        createdAt: { gte: startOfDay },
        changedBy: { role: { name: 'TECHNICIAN' } }
      },
      _count: { id: true }
    });

    const mappedTechnicians = technicians.map((tech) => {
      const resolved = todayResolved.find(t => t.changedById === tech.id);
      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        activeTickets: tech._count.assignments,
        resolvedToday: resolved ? resolved._count.id : 0
      };
    });

    return mappedTechnicians;
  }

  async getAuditLogs(userId: string) {
    return this.findOne(userId);
  }

  async getProfile(userId: string) {
    return this.findOne(userId);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.redisService.del(`user:${userId}`);

    return user;
  }
}
