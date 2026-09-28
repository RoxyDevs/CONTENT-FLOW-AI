import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { SocialAccountStatus } from '@prisma/client';

export class UpdateSocialAccountDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsOptional()
  @IsEnum(SocialAccountStatus)
  status?: SocialAccountStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
