import { IsOptional, IsString, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum DashboardPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  CUSTOM = 'custom',
}

export class DashboardFilterDto {
  @ApiPropertyOptional({ enum: DashboardPeriod, default: DashboardPeriod.MONTH })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

  @ApiPropertyOptional({ description: 'Start date for custom period', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for custom period', type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by department (Admin only)' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
  
  // Hidden fields used internally by controller to scope queries based on roles
  technicianId?: string;
}
