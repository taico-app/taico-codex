import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InputRequestResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the input request',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the task this input request belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  taskId!: string;

  @ApiProperty({
    description: 'ID of the actor who asked the question',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  askedByActorId!: string;

  @ApiProperty({
    description: 'ID of the actor assigned to answer the question',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  assignedToActorId!: string;

  @ApiProperty({
    description: 'The question being asked',
    example: 'Should we use OAuth or JWT for authentication?',
  })
  question!: string;

  @ApiPropertyOptional({
    description: 'The answer to the question',
    example: 'Use JWT with refresh tokens',
    nullable: true,
  })
  answer!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when the question was resolved',
    example: '2025-11-03T12:45:00.000Z',
    nullable: true,
  })
  resolvedAt!: string | null;

  @ApiProperty({
    description: 'Input request creation timestamp',
    example: '2025-11-03T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Input request last update timestamp',
    example: '2025-11-03T12:45:00.000Z',
  })
  updatedAt!: string;
}
