import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SchedulePublicationDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  jobName?: string;
}
