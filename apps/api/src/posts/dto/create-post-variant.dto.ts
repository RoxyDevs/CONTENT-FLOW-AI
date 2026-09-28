import { SocialPlatform } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreatePostVariantDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsObject()
  hashtags?: Record<string, unknown> | string[];

  @IsOptional()
  @IsString()
  cta?: string;

  @IsOptional()
  @IsObject()
  platformMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  externalPostId?: string;
}
