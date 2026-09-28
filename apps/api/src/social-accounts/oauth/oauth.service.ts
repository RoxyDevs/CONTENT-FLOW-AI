import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialPlatform } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SocialAccountsService } from '../social-accounts.service';
import { SocialPlatformAdapter } from '../adapters/social-platform.adapter';
import { WorkspaceContextService } from '../../common/workspace/workspace-context.service';

@Injectable()
export class OauthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly socialAccountsService: SocialAccountsService,
    @Inject('SOCIAL_PLATFORM_ADAPTERS')
    private readonly adapters: Record<string, SocialPlatformAdapter>,
  ) {}

  async getAuthorizationUrl(platform: string, workspaceId: string | undefined, userId: string): Promise<string> {
    const normalizedPlatform = platform.toUpperCase();
    const adapter = this.getAdapter(normalizedPlatform as SocialPlatform);
    const finalWorkspaceId = workspaceId ?? (await this.workspaceContext.resolveWorkspaceId(userId, undefined));

    const redirectUri = this.configService.get(`${normalizedPlatform}_REDIRECT_URI`);

    return adapter.getAuthorizationUrl({
      state: JSON.stringify({ workspaceId: finalWorkspaceId, userId }),
      redirectUri: redirectUri ?? undefined,
      scopes: ['basic'],
      workspaceId: finalWorkspaceId,
      userId,
    });
  }

  async handleCallback(payload: {
    platform: string;
    code: string;
    redirectUri?: string;
    workspaceId?: string | null;
    state?: string | null;
    userId: string;
  }): Promise<{ success: boolean; account: unknown }> {
    const platform = payload.platform.toUpperCase() as SocialPlatform;
    const adapter = this.getAdapter(platform);

    if (!payload.code) {
      throw new BadRequestException('OAuth code is required');
    }

    const resolvedWorkspaceId = this.resolveWorkspaceFromState(payload.workspaceId, payload.state, payload.userId);
    const tokenResult = await adapter.exchangeCodeForToken(payload.code, payload.redirectUri);
    const profile = await adapter.getProfile(tokenResult.accessToken);
    const account = await this.socialAccountsService.upsertFromOAuth({
      userId: payload.userId,
      workspaceId: resolvedWorkspaceId,
      platform,
      externalAccountId: profile.externalAccountId,
      username: profile.username,
      displayName: profile.displayName,
      profileImageUrl: profile.profileImageUrl,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      tokenExpiresAt: tokenResult.expiresIn ? new Date(Date.now() + tokenResult.expiresIn * 1000) : null,
      scopes: tokenResult.scopes ?? ['basic'],
      metadata: {
        ...profile.metadata,
        raw: tokenResult.raw,
      },
    });

    return { success: true, account };
  }

  private async resolveWorkspaceFromState(
    workspaceId: string | null | undefined,
    state: string | null | undefined,
    userId: string,
  ): Promise<string | undefined> {
    if (workspaceId) {
      return workspaceId;
    }

    if (!state) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(state) as { workspaceId?: string; userId?: string };
      if (parsed.workspaceId && parsed.userId === userId) {
        return parsed.workspaceId;
      }
    } catch {
      // Ignore malformed state and fall back to user default workspace.
    }

    return undefined;
  }

  private getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
    const adapter = this.adapters[platform];
    if (!adapter) {
      throw new NotFoundException(`OAuth adapter not found for platform: ${platform}`);
    }
    return adapter;
  }
}
