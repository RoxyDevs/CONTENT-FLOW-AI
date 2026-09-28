import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { slugify } from '../common/utils/slug.util';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.workspaceMembership.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: { workspace: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found or access denied');
    }

    return membership.workspace;
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const baseSlug = slugify(dto.name || 'workspace');
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug,
        brandTone: dto.brandTone,
        language: dto.language,
      },
    });

    await this.prisma.workspaceMembership.create({
      data: {
        userId,
        workspaceId: workspace.id,
        role: 'owner',
      },
    });

    return workspace;
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.role === 'member') {
      throw new ForbiddenException('Only owners/admins can update this workspace');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        brandTone: dto.brandTone,
        language: dto.language,
      },
    });
  }

  async remove(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only workspace owners can delete the workspace');
    }

    await this.prisma.workspace.delete({ where: { id: workspaceId } });

    return { success: true };
  }
}
