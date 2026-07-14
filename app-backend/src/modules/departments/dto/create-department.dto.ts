import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Name of the department' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Unique code for the department (e.g., IT, HR)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9_]+$/, { message: 'Code must contain only letters, numbers, and underscores' })
  code!: string;
}
