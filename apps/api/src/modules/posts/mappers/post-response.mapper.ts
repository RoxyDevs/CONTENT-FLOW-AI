import { PostStatus, SocialPlatform } from '@prisma/client';

export type PostSummaryResponse = {
  id: string;
  title: string | null;
  baseCaption: string | null;
  status: PostStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  variantsCount: number;
  mediaCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PostVariantResponse = {
  id: string;
  platform: SocialPlatform;
  caption: string | null;
  hashtags: unknown;
  cta: string | null;
  publicationStatus: string;
  publishedAt: Date | null;
};

export type PostDetailResponse = {
  id: string;
  title: string | null;
  baseCaption: string | null;
  status: PostStatus;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  variants: PostVariantResponse[];
  mediaAssets: Array<{
    id: string;
    type: string;
    url: string;
    fileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    width: number | null;
    height: number | null;
    durationSeconds: number | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

export class PostResponseMapper {
  static toSummary(post: {
    id: string;
    title: string | null;
    baseCaption: string | null;
    status: PostStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    variants: Array<{ id: string }>;
    mediaAssets: Array<{ id: string }>;
    createdAt: Date;
    updatedAt: Date;
  }): PostSummaryResponse {
    return {
      id: post.id,
      title: post.title,
      baseCaption: post.baseCaption,
      status: post.status,
      scheduledAt: post.scheduledAt,
      publishedAt: post.publishedAt,
      variantsCount: post.variants.length,
      mediaCount: post.mediaAssets.length,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  static toDetail(post: {
    id: string;
    title: string | null;
    baseCaption: string | null;
    status: PostStatus;
    scheduledAt: Date | null;
    publishedAt: Date | null;
    variants: Array<{
      id: string;
      platform: SocialPlatform;
      caption: string | null;
      hashtags: unknown;
      cta: string | null;
      publicationStatus: string;
      publishedAt: Date | null;
    }>;
    mediaAssets: Array<{
      id: string;
      type: string;
      url: string;
      fileName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      width: number | null;
      height: number | null;
      durationSeconds: number | null;
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): PostDetailResponse {
    return {
      id: post.id,
      title: post.title,
      baseCaption: post.baseCaption,
      status: post.status,
      scheduledAt: post.scheduledAt,
      publishedAt: post.publishedAt,
      variants: post.variants.map((variant) => ({
        id: variant.id,
        platform: variant.platform,
        caption: variant.caption,
        hashtags: variant.hashtags,
        cta: variant.cta,
        publicationStatus: variant.publicationStatus,
        publishedAt: variant.publishedAt,
      })),
      mediaAssets: post.mediaAssets.map((asset) => ({
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
      })),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}
