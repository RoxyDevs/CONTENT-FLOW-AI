import { SocialPlatform } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

export class GeneratePostVariantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(SocialPlatform, { each: true })
  platforms: SocialPlatform[];
}
