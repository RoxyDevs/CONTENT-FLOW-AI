import { IsDateString, IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreatePublicationJobDto {
  @IsString()
  postId: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  jobName?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
