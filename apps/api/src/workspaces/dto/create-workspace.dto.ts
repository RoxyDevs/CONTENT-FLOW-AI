import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  brandTone?: string;

  @IsOptional()
  @IsString()
  language?: string;
}
