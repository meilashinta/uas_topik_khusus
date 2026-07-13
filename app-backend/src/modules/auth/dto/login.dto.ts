import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email address of the user' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password of the user', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
