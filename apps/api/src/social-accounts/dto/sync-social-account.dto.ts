import { IsOptional, IsString } from 'class-validator';

export class SyncSocialAccountDto {
  @IsOptional()
  @IsString()
  forceRefresh?: string;
}
