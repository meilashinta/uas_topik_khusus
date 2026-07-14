import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Title of the ticket', minLength: 5, maxLength: 200 })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Detailed description of the issue', minLength: 10 })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ description: 'UUID of the category' })
  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ description: 'UUID of the priority level' })
  @IsNotEmpty()
  @IsUUID()
  priorityId!: string;
}
