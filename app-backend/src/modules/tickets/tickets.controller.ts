import { Controller, Get, Post, Body, Patch, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
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
  @ApiResponse({ status: 200, description: 'Return list of tickets with pagination and filtering' })
  async findAll(@Req() req: any, @Query() filterDto: TicketFilterDto) {
    return this.ticketsService.findAll(filterDto, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket detail' })
  @ApiResponse({ status: 200, description: 'Return ticket detail with full relations' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.findOne(id, req.user);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket title/description (EMPLOYEE only, OPEN status only)' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(id, updateTicketDto, req.user, req);
  }

  @Roles(RoleName.EMPLOYEE)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel ticket (EMPLOYEE only, OPEN status only)' })
  @ApiResponse({ status: 200, description: 'Ticket cancelled successfully' })
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.ticketsService.cancel(id, req.user, req);
  }
}
