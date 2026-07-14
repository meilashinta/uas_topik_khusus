import { IsOptional, IsString, IsEnum, IsDateString, IsUUID, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class ReportFilterDto {
  @ApiProperty({ description: 'Start date for the report', type: String, format: 'date-time' })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ description: 'End date for the report', type: String, format: 'date-time' })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsUUID()
  priorityId?: string;

  @ApiPropertyOptional({ description: 'Filter by technician' })
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filter by ticket status' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiProperty({ description: 'Export format', enum: ['pdf', 'xlsx'] })
  @IsIn(['pdf', 'xlsx'])
  format!: 'pdf' | 'xlsx';
}
