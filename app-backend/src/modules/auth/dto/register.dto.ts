import { IsString, IsEmail, MinLength, Matches, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Full name of the user', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ 
    description: 'Password containing at least 8 characters, including letters and numbers',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: 'password must contain at least 1 letter and 1 number',
  })
  password!: string;

  @ApiProperty({ description: 'ID of the department this user belongs to' })
  @IsUUID()
  departmentId!: string;
}
