import { IsBoolean, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'The content of the comment', minLength: 1 })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Whether the comment is internal (only visible to staff)', default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
