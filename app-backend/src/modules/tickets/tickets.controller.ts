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
import { AssignTechnicianDto } from './dto/assign-technician.dto';
import { ReassignTechnicianDto } from './dto/reassign-technician.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentFilterDto } from './dto/comment-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../../common/pipes/file-validation.pipe';
import { Res, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import type { Response } from 'express';

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

  @Roles(RoleName.SUPERVISOR, RoleName.ADMINISTRATOR)
  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign a technician to a ticket' })
  async assign(@Req() req: any, @Param('id') id: string, @Body() assignDto: AssignTechnicianDto) {
    return this.ticketsService.assign(id, assignDto, req.user, req);
  }

  @Roles(RoleName.SUPERVISOR, RoleName.ADMINISTRATOR)
  @Post(':id/reassign')
  @ApiOperation({ summary: 'Reassign a technician to a ticket' })
  async reassign(@Req() req: any, @Param('id') id: string, @Body() reassignDto: ReassignTechnicianDto) {
    return this.ticketsService.reassign(id, reassignDto, req.user, req);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  async addComment(@Req() req: any, @Param('id') id: string, @Body() createCommentDto: CreateCommentDto) {
    return this.ticketsService.addComment(id, createCommentDto, req.user, req);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments of a ticket' })
  async getComments(@Req() req: any, @Param('id') id: string, @Query() filterDto: CommentFilterDto) {
    return this.ticketsService.getComments(id, filterDto, req.user);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload an attachment to a ticket' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Req() req: any, 
    @Param('id') id: string, 
    @UploadedFile(FileValidationPipe) file: Express.Multer.File
  ) {
    return this.ticketsService.uploadAttachment(id, file, req.user, req);
  }

  @Get(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download an attachment' })
  async downloadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response
  ) {
    const { buffer, attachment } = await this.ticketsService.downloadAttachment(id, attachmentId, req.user);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
    });
    res.send(buffer);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an attachment' })
  async deleteAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string
  ) {
    return this.ticketsService.deleteAttachment(id, attachmentId, req.user, req);
  }
}
