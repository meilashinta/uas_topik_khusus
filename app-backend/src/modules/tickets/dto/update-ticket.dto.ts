import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({ description: 'Title of the ticket', minLength: 5, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the issue', minLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;
}
