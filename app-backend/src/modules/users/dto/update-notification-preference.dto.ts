import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ description: 'Enable or disable email notifications' })
  @IsBoolean()
  emailNotificationEnabled!: boolean;
}
