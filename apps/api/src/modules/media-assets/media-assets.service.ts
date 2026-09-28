import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../common/workspace/workspace-context.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { ListMediaAssetsQueryDto } from './dto/list-media-assets-query.dto';
import { MediaAssetResponseMapper } from './mappers/media-asset-response.mapper';

@Injectable()
export class MediaAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  async create(userId: string, dto: CreateMediaAssetDto) {
    const workspaceId = await this.workspaceContext.resolveWorkspaceId(userId, undefined);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        workspaceId,
        type: dto.type,
        url: dto.url,
        fileName: dto.fileName ?? null,
        mimeType: dto.mimeType ?? null,
        sizeBytes: dto.sizeBytes ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null,
        durationSeconds: dto.durationSeconds ?? null,
      },
    });

    return MediaAssetResponseMapper.toResponse(asset);
  }

  async findAll(userId: string, query: ListMediaAssetsQueryDto) {
    const workspaceId = await this.workspaceContext.resolveWorkspaceId(userId, undefined);

    const where: Prisma.MediaAssetWhereInput = {
      workspaceId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { fileName: { contains: term, mode: 'insensitive' } },
        { mimeType: { contains: term, mode: 'insensitive' } },
        { url: { contains: term, mode: 'insensitive' } },
      ];
    }

    const assets = await this.prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return MediaAssetResponseMapper.toResponseList(assets);
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, asset.workspaceId);

    return MediaAssetResponseMapper.toResponse(asset);
  }

  async remove(userId: string, id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new NotFoundException('Media asset not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, asset.workspaceId);

    const isLinkedToPublishedPost = await this.prisma.post.findFirst({
      where: {
        id: asset.postId ?? '',
        workspaceId: asset.workspaceId,
        status: 'PUBLISHED',
      },
    });

    if (isLinkedToPublishedPost) {
      throw new BadRequestException(
        'This media asset is attached to a published post and cannot be removed.',
      );
    }

    await this.prisma.mediaAsset.delete({ where: { id } });

    return { success: true, id };
  }
}
