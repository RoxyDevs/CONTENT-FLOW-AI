import { IsString } from 'class-validator';

export class AttachMediaToPostDto {
  @IsString()
  mediaAssetId: string;
}
