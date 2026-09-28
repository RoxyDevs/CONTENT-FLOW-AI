import { SocialPlatform } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GenerateVariantDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  baseCaption?: string;

  @IsOptional()
  @IsString()
  brandTone?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
