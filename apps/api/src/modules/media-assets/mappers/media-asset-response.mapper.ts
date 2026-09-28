import { MediaType } from '@prisma/client';

export type MediaAssetResponse = {
  id: string;
  type: MediaType;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  createdAt: Date;
};

export class MediaAssetResponseMapper {
  static toResponse(asset: {
    id: string;
    type: MediaType;
    url: string;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    createdAt: Date;
  }): MediaAssetResponse {
    return {
      id: asset.id,
      type: asset.type,
      url: asset.url,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.durationSeconds,
      createdAt: asset.createdAt,
    };
  }

  static toResponseList(
    assets: Array<{
      id: string;
      type: MediaType;
      url: string;
      fileName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      width: number | null;
      height: number | null;
      durationSeconds: number | null;
      createdAt: Date;
    }>,
  ): MediaAssetResponse[] {
    return assets.map((asset) => this.toResponse(asset));
  }
}
