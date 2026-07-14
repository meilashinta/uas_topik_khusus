import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token provided during login' })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
