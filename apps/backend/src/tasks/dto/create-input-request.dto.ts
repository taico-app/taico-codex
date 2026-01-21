import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateInputRequestDto {
  @ApiProperty({
    description: 'ID of the actor assigned to answer the question',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsUUID()
  @IsNotEmpty()
  assignedToActorId!: string;

  @ApiProperty({
    description: 'The question being asked',
    example: 'Should we use OAuth or JWT for authentication?',
  })
  @IsString()
  @IsNotEmpty()
  question!: string;
}
