import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTechnicianDto {
  @ApiProperty({ description: 'UUID of the technician to assign' })
  @IsNotEmpty()
  @IsUUID()
  technicianId!: string;
}
