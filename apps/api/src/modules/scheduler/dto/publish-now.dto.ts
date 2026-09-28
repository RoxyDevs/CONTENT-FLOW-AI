import { IsOptional, IsString } from 'class-validator';

export class PublishNowDto {
  @IsOptional()
  @IsString()
  jobName?: string;
}
