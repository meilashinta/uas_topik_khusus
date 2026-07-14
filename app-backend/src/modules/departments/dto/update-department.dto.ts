import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ description: 'Name of the department' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Unique code for the department (e.g., IT, HR)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, { message: 'Code must contain only letters, numbers, and underscores' })
  code?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
