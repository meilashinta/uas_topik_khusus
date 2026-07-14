import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePriorityDto {
  @ApiPropertyOptional({ description: 'Response SLA in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaResponseMinutes?: number;

  @ApiPropertyOptional({ description: 'Resolution SLA in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaResolutionMinutes?: number;
}
