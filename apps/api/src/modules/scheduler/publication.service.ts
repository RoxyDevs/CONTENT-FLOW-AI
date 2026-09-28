import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialAccountStatus, SocialPlatform, VariantPublicationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { SocialPlatformAdapter } from '../../social-accounts/adapters/social-platform.adapter';
import { PublicationJobLogService } from './publication-job-log.service';

export type PublicationVariantResult = {
  variantId: string;
  platform: SocialPlatform;
  status: 'PUBLISHED' | 'FAILED';
  externalPostId?: string | null;
  message?: string;
};

export type PublishPostResult = {
  postId: string;
  workspaceId: string;
  status: 'PUBLISHED' | 'FAILED';
  publishedVariants: number;
  failedVariants: number;
  variantResults: PublicationVariantResult[];
};

@Injectable()
export class PublicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socialAccountsService: SocialAccountsService,
    private readonly publicationJobLogService: PublicationJobLogService,
  ) {}

  async publishPost(workspaceId: string, postId: string, userId: string, jobLogId?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: {
        variants: true,
        mediaAssets: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        status: SocialAccountStatus.CONNECTED,
      },
    });

    const accountByPlatform = new Map(accounts.map((account) => [account.platform, account]));
    const variantResults: PublicationVariantResult[] = [];
    let publishedVariants = 0;
    let failedVariants = 0;

    for (const variant of post.variants) {
      const account = accountByPlatform.get(variant.platform);

      if (!account) {
        await this.prisma.postVariant.update({
          where: { id: variant.id },
          data: {
            publicationStatus: 'FAILED',
            publishedAt: null,
          },
        });

        failedVariants += 1;
        variantResults.push({
          variantId: variant.id,
          platform: variant.platform,
          status: 'FAILED',
          message: `No connected social account found for ${variant.platform}.`,
        });
        continue;
      }

      const adapter = this.getAdapterForPlatform(variant.platform);
      const payload = {
        workspaceId,
        postId,
        variantId: variant.id,
        platform: variant.platform,
        caption: variant.caption ?? post.baseCaption ?? '',
        hashtags: Array.isArray(variant.hashtags) ? variant.hashtags : [],
        cta: variant.cta ?? '',
        mediaUrls: post.mediaAssets.map((asset) => asset.url),
        title: post.title ?? 'ContentFlow AI Post',
        userId,
        accountId: account.id,
        metadata: (variant.platformMetadata as Record<string, unknown>) ?? {},
      };

      try {
        const adapterResult = await this.publishWithFallback(adapter, payload);

        await this.prisma.postVariant.update({
          where: { id: variant.id },
          data: {
            publicationStatus: 'PUBLISHED',
            externalPostId:
              typeof adapterResult.externalPostId === 'string'
                ? adapterResult.externalPostId
                : `cf-${variant.platform.toLowerCase()}-${Date.now()}`,
            publishedAt: new Date(),
            platformMetadata: adapterResult.raw ?? payload.metadata,
          },
        });

        publishedVariants += 1;
        variantResults.push({
          variantId: variant.id,
          platform: variant.platform,
          status: 'PUBLISHED',
          externalPostId:
            typeof adapterResult.externalPostId === 'string'
              ? adapterResult.externalPostId
              : `cf-${variant.platform.toLowerCase()}-${Date.now()}`,
          message: adapterResult.message ?? 'Published successfully.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown publication failure';

        await this.prisma.postVariant.update({
          where: { id: variant.id },
          data: {
            publicationStatus: VariantPublicationStatus.FAILED,
            publishedAt: null,
          },
        });

        failedVariants += 1;
        variantResults.push({
          variantId: variant.id,
          platform: variant.platform,
          status: 'FAILED',
          message,
        });
      }
    }

    const finalStatus: 'PUBLISHED' | 'FAILED' = publishedVariants > 0 ? 'PUBLISHED' : 'FAILED';

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: finalStatus,
        scheduledAt: null,
        publishedAt: publishedVariants > 0 ? new Date() : post.publishedAt,
      },
    });

    if (jobLogId) {
      await this.publicationJobLogService.updateStatus(jobLogId, {
        status: finalStatus === 'PUBLISHED' ? 'COMPLETED' : 'FAILED',
        finishedAt: new Date(),
        errorMessage:
          failedVariants > 0 && publishedVariants === 0
            ? `All variants failed to publish. ${failedVariants} failed.`
            : null,
      });
    }

    return {
      postId,
      workspaceId,
      status: finalStatus,
      publishedVariants,
      failedVariants,
      variantResults,
    } satisfies PublishPostResult;
  }

  private getAdapterForPlatform(platform: SocialPlatform): SocialPlatformAdapter {
    try {
      return this.socialAccountsService.getAdapter(platform);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown adapter error';
      throw new BadRequestException(`No social adapter registered for platform: ${platform}. ${message}`);
    }
  }

  private async publishWithFallback(
    adapter: SocialPlatformAdapter,
    payload: Record<string, unknown>,
  ): Promise<{ externalPostId?: string; raw?: Record<string, unknown>; message?: string }> {
    if (!adapter.publishPost) {
      return {
        externalPostId: `mock-${String(payload.platform).toLowerCase()}-${Date.now()}`,
        raw: {
          platform: payload.platform,
          mode: 'placeholder',
          payload,
        },
        message: 'Platform adapter does not implement publishPost; placeholder publication used.',
      };
    }

    const response = await adapter.publishPost(payload);

    return {
      externalPostId:
        typeof response.externalPostId === 'string'
          ? response.externalPostId
          : typeof response.id === 'string'
            ? response.id
            : undefined,
      raw: typeof response.raw === 'object' && response.raw ? (response.raw as Record<string, unknown>) : payload,
      message: typeof response.message === 'string' ? response.message : 'Published successfully.',
    };
  }
}
