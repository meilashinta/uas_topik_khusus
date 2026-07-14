import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTicketDto {
  @ApiProperty({ description: 'Reason for rejecting the ticket', minLength: 10 })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason!: string;
}
