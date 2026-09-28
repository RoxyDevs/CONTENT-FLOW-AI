import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { SocialAccountStatus, SocialPlatform } from '@prisma/client';

export class CreateSocialAccountDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsString()
  @IsNotEmpty()
  externalAccountId: string;

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
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsDateString()
  tokenExpiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(SocialAccountStatus)
  status?: SocialAccountStatus;

  @IsOptional()
  @IsDateString()
  connectedAt?: string;
}

export type CreateSocialAccountInput = {
  workspaceId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  status?: SocialAccountStatus;
  connectedAt?: Date;
};
