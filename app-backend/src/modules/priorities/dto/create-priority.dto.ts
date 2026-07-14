import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel } from '@prisma/client';

export class CreatePriorityDto {
  @ApiProperty({ description: 'Priority level name', enum: PriorityLevel })
  @IsNotEmpty()
  @IsEnum(PriorityLevel)
  name!: PriorityLevel;

  @ApiProperty({ description: 'Response SLA in minutes' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  slaResponseMinutes!: number;

  @ApiProperty({ description: 'Resolution SLA in minutes' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  slaResolutionMinutes!: number;
}
