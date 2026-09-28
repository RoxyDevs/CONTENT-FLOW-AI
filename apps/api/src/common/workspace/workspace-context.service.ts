import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspaceContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveWorkspaceId(userId: string, requestedWorkspaceId?: string | null): Promise<string> {
    if (requestedWorkspaceId) {
      await this.assertUserHasWorkspaceAccess(userId, requestedWorkspaceId);
      return requestedWorkspaceId;
    }

    const membership = await this.prisma.workspaceMembership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException('No workspace found for this user');
    }

    return membership.workspaceId;
  }

  async assertUserHasWorkspaceAccess(userId: string, workspaceId: string): Promise<void> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Workspace not found or access denied');
    }
  }
}
