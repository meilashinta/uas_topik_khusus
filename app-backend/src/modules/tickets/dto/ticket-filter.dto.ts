import { IsOptional, IsString, IsUUID, IsEnum, IsArray, IsDateString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class TicketFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by ticket status (comma separated)' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return value;
  })
  @IsEnum(TicketStatus, { each: true })
  status?: TicketStatus[];

  @ApiPropertyOptional({ description: 'Filter by priority ID' })
  @IsOptional()
  @IsUUID()
  priorityId?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by createdBy ID' })
  @IsOptional()
  @IsUUID()
  createdById?: string;

  @ApiPropertyOptional({ description: 'Filter tickets created after this date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter tickets created before this date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ description: 'Filter by overdue SLA', required: false, type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOverdue?: boolean;

  @ApiProperty({ description: 'Search term for title or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
