import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ description: 'New ticket status', enum: TicketStatus })
  @IsNotEmpty()
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @ApiPropertyOptional({ description: 'Optional note for the status change (required if RESOLVED)' })
  @IsOptional()
  @IsString()
  note?: string;
}
