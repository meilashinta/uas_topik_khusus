import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReopenTicketDto {
  @ApiProperty({ description: 'Reason for reopening the ticket', minLength: 10 })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason!: string;
}
