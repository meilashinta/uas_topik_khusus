import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'The email address associated with the account' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
