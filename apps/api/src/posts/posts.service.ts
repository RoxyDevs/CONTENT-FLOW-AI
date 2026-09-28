import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiContentService } from '../modules/ai/ai-content.service';
import { PostResponseMapper } from '../modules/posts/mappers/post-response.mapper';
import { CreatePostDto } from './dto/create-post.dto';
import { GeneratePostVariantsDto } from './dto/generate-post-variants.dto';
import { GenerateVariantDto } from './dto/generate-variant.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiContentService: AiContentService,
  ) {}

  async findAll(workspaceId: string, status?: string) {
    const filters: Prisma.PostWhereInput = { workspaceId };

    if (status) {
      const normalized = status.toUpperCase();
      if (!(normalized in PostStatus)) {
        throw new BadRequestException('Invalid post status');
      }
      filters.status = normalized as PostStatus;
    }

    const posts = await this.prisma.post.findMany({
      where: filters,
      include: {
        mediaAssets: true,
        variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((post) => PostResponseMapper.toSummary(post));
  }

  async findOne(workspaceId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, workspaceId },
      include: {
        mediaAssets: true,
        variants: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return PostResponseMapper.toDetail(post);
  }

  async create(workspaceId: string, createdById: string, dto: CreatePostDto) {
    const data: Prisma.PostCreateInput = {
      workspace: { connect: { id: workspaceId } },
      createdBy: { connect: { id: createdById } },
      title: dto.title ?? null,
      baseCaption: dto.baseCaption ?? null,
      status: dto.status ?? PostStatus.DRAFT,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      mediaAssets: dto.mediaAssets
        ? {
            create: dto.mediaAssets.map((asset) => ({
              workspace: { connect: { id: workspaceId } },
              type: asset.type,
              url: asset.url,
              fileName: asset.fileName ?? null,
              mimeType: asset.mimeType ?? null,
              sizeBytes: asset.sizeBytes ?? null,
              width: asset.width ?? null,
              height: asset.height ?? null,
              durationSeconds: asset.durationSeconds ?? null,
            })),
          }
        : undefined,
      variants: dto.variants
        ? {
            create: dto.variants.map((variant) => ({
              platform: variant.platform,
              caption: variant.caption ?? null,
              hashtags: variant.hashtags ?? undefined,
              cta: variant.cta ?? null,
              platformMetadata: variant.platformMetadata ?? undefined,
              externalPostId: variant.externalPostId ?? null,
              publicationStatus: 'DRAFT',
            })),
          }
        : undefined,
    };

    const post = await this.prisma.post.create({
      data,
      include: {
        mediaAssets: true,
        variants: true,
      },
    });

    return PostResponseMapper.toDetail(post);
  }

  async update(workspaceId: string, id: string, dto: UpdatePostDto, updatedById: string) {
    const existing = await this.prisma.post.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    const data: Prisma.PostUpdateInput = {
      title: dto.title ?? undefined,
      baseCaption: dto.baseCaption ?? undefined,
      status: dto.status ?? undefined,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    };

    if (dto.mediaAssets) {
      await this.prisma.mediaAsset.deleteMany({ where: { postId: id } });
      data.mediaAssets = {
        create: dto.mediaAssets.map((asset) => ({
          workspace: { connect: { id: workspaceId } },
          type: asset.type,
          url: asset.url,
          fileName: asset.fileName ?? null,
          mimeType: asset.mimeType ?? null,
          sizeBytes: asset.sizeBytes ?? null,
          width: asset.width ?? null,
          height: asset.height ?? null,
          durationSeconds: asset.durationSeconds ?? null,
        })),
      };
    }

    if (dto.variants) {
      await this.prisma.postVariant.deleteMany({ where: { postId: id } });
      data.variants = {
        create: dto.variants.map((variant) => ({
          platform: variant.platform,
          caption: variant.caption ?? null,
          hashtags: variant.hashtags ?? undefined,
          cta: variant.cta ?? null,
          platformMetadata: variant.platformMetadata ?? undefined,
          externalPostId: variant.externalPostId ?? null,
          publicationStatus: 'DRAFT',
        })),
      };
    }

    const post = await this.prisma.post.update({
      where: { id },
      data,
      include: {
        mediaAssets: true,
        variants: true,
      },
    });

    return PostResponseMapper.toDetail(post);
  }

  async attachMediaAsset(userId: string, workspaceId: string, postId: string, mediaAssetId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: { mediaAssets: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Published posts cannot receive new media attachments.');
    }

    const asset = await this.prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException('Media asset not found in this workspace');
    }

    if (asset.postId && asset.postId !== postId) {
      throw new BadRequestException('This media asset is already attached to another post.');
    }

    await this.prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { postId },
    });

    const updatedPost = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: { mediaAssets: true, variants: true },
    });

    return updatedPost ? PostResponseMapper.toDetail(updatedPost) : { success: true };
  }

  async generateVariant(userId: string, workspaceId: string, dto: GenerateVariantDto) {
    await this.prisma.workspaceMembership.findUniqueOrThrow({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    const draft = this.aiContentService.generateCaptionVariants(dto.baseCaption ?? '', [dto.platform]);

    return {
      generated: true,
      workspaceId,
      userId,
      draft,
    };
  }

  async generateVariantsForPost(
    userId: string,
    workspaceId: string,
    postId: string,
    dto: GeneratePostVariantsDto,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: { variants: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    if (!post.baseCaption || !post.baseCaption.trim()) {
      throw new BadRequestException('baseCaption is required before generating variants');
    }

    if (!dto.platforms || dto.platforms.length === 0) {
      throw new BadRequestException('At least one platform is required');
    }

    const generated = this.aiContentService.generateCaptionVariants(post.baseCaption, dto.platforms);

    const updatedVariants = await Promise.all(
      generated.map(async (variant) => {
        const existing = await this.prisma.postVariant.findUnique({
          where: {
            postId_platform: {
              postId,
              platform: variant.platform,
            },
          },
        });

        if (existing) {
          return this.prisma.postVariant.update({
            where: { id: existing.id },
            data: {
              caption: variant.caption,
              hashtags: variant.hashtags,
              cta: variant.cta,
              publicationStatus: 'READY',
            },
          });
        }

        return this.prisma.postVariant.create({
          data: {
            postId,
            platform: variant.platform,
            caption: variant.caption,
            hashtags: variant.hashtags,
            cta: variant.cta,
            publicationStatus: 'READY',
          },
        });
      }),
    );

    const refreshedPost = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
      include: { mediaAssets: true, variants: true },
    });

    return {
      generated: true,
      variants: updatedVariants,
      post: refreshedPost ? PostResponseMapper.toDetail(refreshedPost) : null,
    };
  }

  async remove(workspaceId: string, id: string, deletedById: string) {
    const existing = await this.prisma.post.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Post not found');
    }

    await this.prisma.post.delete({ where: { id } });

    return { success: true, id };
  }
}
