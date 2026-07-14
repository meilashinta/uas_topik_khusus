import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReassignTechnicianDto {
  @ApiProperty({ description: 'UUID of the new technician to assign' })
  @IsNotEmpty()
  @IsUUID()
  technicianId!: string;

  @ApiProperty({ description: 'Reason for reassignment', minLength: 10 })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason!: string;
}
