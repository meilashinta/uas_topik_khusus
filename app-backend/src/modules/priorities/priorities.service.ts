import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';

@Injectable()
export class PrioritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.ticketPriority.findMany({
      orderBy: { slaResponseMinutes: 'asc' }, // usually critical to low
    });
  }

  async findOne(id: string) {
    const priority = await this.prisma.ticketPriority.findUnique({
      where: { id },
      include: {
        _count: { select: { tickets: true } },
      },
    });

    if (!priority) throw new NotFoundException('Priority not found');
    return priority;
  }

  async create(createDto: CreatePriorityDto, performedByUserId: string, req: any) {
    const existing = await this.prisma.ticketPriority.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException(`Priority level ${createDto.name} already exists`);
    }

    const newPriority = await this.prisma.ticketPriority.create({
      data: createDto,
    });

    await this.auditLogService.logAction(
      'PRIORITY_CREATED',
      'TicketPriority',
      newPriority.id,
      performedByUserId,
      createDto,
      req
    );

    return newPriority;
  }

  async update(id: string, updateDto: UpdatePriorityDto, performedByUserId: string, req: any) {
    const priority = await this.prisma.ticketPriority.findUnique({ where: { id } });
    if (!priority) throw new NotFoundException('Priority not found');

    const updatedPriority = await this.prisma.ticketPriority.update({
      where: { id },
      data: updateDto,
    });

    await this.auditLogService.logAction(
      'PRIORITY_UPDATED',
      'TicketPriority',
      updatedPriority.id,
      performedByUserId,
      updateDto,
      req
    );

    return updatedPriority;
  }

  async softDelete(id: string, performedByUserId: string, req: any) {
    const priority = await this.prisma.ticketPriority.findUnique({
      where: { id },
      include: { _count: { select: { tickets: true } } },
    });

    if (!priority) throw new NotFoundException('Priority not found');
    if (!priority.isActive) throw new BadRequestException('Priority is already deactivated');

    const deactivatedPriority = await this.prisma.ticketPriority.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditLogService.logAction(
      'PRIORITY_DEACTIVATED',
      'TicketPriority',
      deactivatedPriority.id,
      performedByUserId,
      { activeTicketsCount: priority._count.tickets },
      req
    );

    return { message: 'Priority successfully deactivated' };
  }
}
