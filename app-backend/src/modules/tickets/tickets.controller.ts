import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { RejectTicketDto } from './dto/reject-ticket.dto';
import { CloseTicketDto } from './dto/close-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('api/v1/tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Roles(RoleName.EMPLOYEE)
  @Post()
  @ApiOperation({ summary: 'Create new ticket (EMPLOYEE only)' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  async create(@Req() req: any, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto, req.user, req);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of tickets' })
  async findAll(@Req() req: any, @Query() filterDto: TicketFilterDto) {
    return this.ticketsService.findAll(filterDto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket detail' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req.user);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get ticket history logs' })
  async getHistory(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.getHistory(id, req.user);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket title/description (EMPLOYEE only, OPEN status only)' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto, req.user, req);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel ticket (EMPLOYEE only, OPEN status only)' })
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.cancel(id, req.user, req);
  }

  @Roles(RoleName.SUPERVISOR, RoleName.ADMINISTRATOR)
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject ticket (SUPERVISOR/ADMIN only, OPEN status only)' })
  async reject(@Req() req: any, @Param('id') id: string, @Body() rejectDto: RejectTicketDto) {
    return this.ticketsService.reject(id, rejectDto, req.user, req);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id/close')
  @ApiOperation({ summary: 'Close ticket with rating (EMPLOYEE only, RESOLVED status only)' })
  async close(@Req() req: any, @Param('id') id: string, @Body() closeDto: CloseTicketDto) {
    return this.ticketsService.close(id, closeDto, req.user, req);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen ticket (EMPLOYEE only, RESOLVED status only)' })
  async reopen(@Req() req: any, @Param('id') id: string, @Body() reopenDto: ReopenTicketDto) {
    return this.ticketsService.reopen(id, reopenDto, req.user, req);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Generic status update (Enforces State Machine)' })
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.ticketsService.updateStatus(id, updateStatusDto, req.user, req);
  }
}
