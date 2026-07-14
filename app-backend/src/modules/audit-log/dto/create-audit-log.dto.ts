import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'User ID performing the action, null if system action' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiProperty({ description: 'Action performed' })
  @IsString()
  action!: string;

  @ApiProperty({ description: 'Entity type affected' })
  @IsString()
  entityType!: string;

  @ApiProperty({ description: 'Entity ID affected' })
  @IsUUID()
  entityId!: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiProperty({ description: 'IP Address' })
  @IsString()
  ipAddress!: string;

  @ApiPropertyOptional({ description: 'Event ID for idempotency' })
  @IsOptional()
  @IsString()
  eventId?: string;
}
