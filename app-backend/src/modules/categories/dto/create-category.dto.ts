import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Name of the category' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Description of the category' })
  @IsNotEmpty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Optional ID of the department that owns this category' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
