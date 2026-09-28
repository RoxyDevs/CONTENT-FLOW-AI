import { IsOptional, IsString } from 'class-validator';

export class CancelPublicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
