import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AnswerInputRequestDto {
  @ApiProperty({
    description: 'The answer to the question',
    example: 'Use JWT with refresh tokens for better security and scalability',
  })
  @IsString()
  @IsNotEmpty()
  answer!: string;
}
