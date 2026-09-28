import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SocialAccountStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../common/workspace/workspace-context.service';
import { decryptValue, encryptValue } from '../common/security/encryption.util';
import { SocialPlatformAdapter } from './adapters/social-platform.adapter';
import { CreateSocialAccountDto, CreateSocialAccountInput } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import { SyncSocialAccountDto } from './dto/sync-social-account.dto';

export type SocialAccountSafeResponse = {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  externalAccountId: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  status: SocialAccountStatus;
  connectedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  scopes: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  hasToken: boolean;
};

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly configService: ConfigService,
    @Inject('SOCIAL_PLATFORM_ADAPTERS')
    private readonly adapters: Record<string, SocialPlatformAdapter>,
  ) {}

  async findAll(
    userId: string,
    filters?: { platform?: SocialPlatform; status?: SocialAccountStatus },
  ): Promise<SocialAccountSafeResponse[]> {
    const workspaceId = await this.workspaceContext.resolveWorkspaceId(userId, undefined);

    const where: Prisma.SocialAccountWhereInput = {
      workspaceId,
    };

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const accounts = await this.prisma.socialAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => this.toSafeResponse(account));
  }

  async findOne(userId: string, id: string): Promise<SocialAccountSafeResponse> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, account.workspaceId);

    return this.toSafeResponse(account);
  }

  async connectManualAccount(
    userId: string,
    dto: CreateSocialAccountDto,
  ): Promise<SocialAccountSafeResponse> {
    const workspaceId = await this.workspaceContext.resolveWorkspaceId(
      userId,
      dto.workspaceId ?? null,
    );

    if (!dto.accessToken) {
      throw new BadRequestException('accessToken is required for manual connection');
    }

    return this.upsertLinkedAccount({
      workspaceId,
      platform: dto.platform,
      externalAccountId: dto.externalAccountId,
      username: dto.username ?? null,
      displayName: dto.displayName ?? null,
      profileImageUrl: dto.profileImageUrl ?? null,
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken ?? null,
      tokenExpiresAt: dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null,
      scopes: dto.scopes ?? [],
      metadata: dto.metadata ?? {},
      status: dto.status ?? SocialAccountStatus.CONNECTED,
      connectedAt: dto.connectedAt ? new Date(dto.connectedAt) : new Date(),
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSocialAccountDto,
  ): Promise<SocialAccountSafeResponse> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, account.workspaceId);

    const updated = await this.prisma.socialAccount.update({
      where: { id },
      data: {
        username: dto.username,
        displayName: dto.displayName,
        profileImageUrl: dto.profileImageUrl,
        status: dto.status,
        metadata: dto.metadata,
      },
    });

    return this.toSafeResponse(updated);
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; id: string }> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, account.workspaceId);

    await this.prisma.socialAccount.update({
      where: { id },
      data: {
        status: SocialAccountStatus.REVOKED,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        connectedAt: account.connectedAt ?? new Date(),
      },
    });

    return { success: true, id };
  }

  async refreshToken(userId: string, id: string): Promise<{ id: string; status: SocialAccountStatus; message: string }> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, account.workspaceId);

    const adapter = this.getAdapter(account.platform);
    const refreshTokenValue = account.refreshTokenEncrypted ? this.decryptToken(account.refreshTokenEncrypted) : null;

    if (!refreshTokenValue) {
      return {
        id,
        status: account.status,
        message: `The platform ${account.platform} does not support token refresh for this account or no refresh token is stored.`,
      };
    }

    const refreshed = await adapter.refreshToken(refreshTokenValue);
    const nextExpiresAt = refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : null;

    await this.prisma.socialAccount.update({
      where: { id },
      data: {
        accessTokenEncrypted: encryptValue(refreshed.accessToken),
        refreshTokenEncrypted: refreshed.refreshToken ? encryptValue(refreshed.refreshToken) : account.refreshTokenEncrypted,
        tokenExpiresAt: nextExpiresAt,
        status: SocialAccountStatus.CONNECTED,
      },
    });

    return {
      id,
      status: SocialAccountStatus.CONNECTED,
      message: `Token refreshed successfully for ${account.platform}.`,
    };
  }

  async sync(
    userId: string,
    id: string,
    dto: SyncSocialAccountDto,
  ): Promise<SocialAccountSafeResponse> {
    const account = await this.prisma.socialAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.workspaceContext.assertUserHasWorkspaceAccess(userId, account.workspaceId);

    const adapter = this.getAdapter(account.platform);
    const accessToken = account.accessTokenEncrypted ? this.decryptToken(account.accessTokenEncrypted) : null;

    if (!accessToken) {
      throw new BadRequestException('This account does not have a valid access token to sync');
    }

    const profile = await adapter.getProfile(accessToken);
    const updated = await this.prisma.socialAccount.update({
      where: { id },
      data: {
        username: profile.username ?? account.username,
        displayName: profile.displayName ?? account.displayName,
        profileImageUrl: profile.profileImageUrl ?? account.profileImageUrl,
        externalAccountId: profile.externalAccountId ?? account.externalAccountId,
        metadata: {
          ...(account.metadata as Record<string, unknown> | null),
          ...(profile.metadata ?? {}),
        },
        lastSyncedAt: new Date(),
        status: SocialAccountStatus.CONNECTED,
      },
    });

    return this.toSafeResponse(updated);
  }

  async upsertFromOAuth(args: {
    userId: string;
    workspaceId?: string | null;
    platform: SocialPlatform;
    externalAccountId: string;
    username?: string | null;
    displayName?: string | null;
    profileImageUrl?: string | null;
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
    scopes?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<SocialAccountSafeResponse> {
    const workspaceId = await this.workspaceContext.resolveWorkspaceId(
      args.userId,
      args.workspaceId ?? null,
    );

    return this.upsertLinkedAccount({
      workspaceId,
      platform: args.platform,
      externalAccountId: args.externalAccountId,
      username: args.username ?? null,
      displayName: args.displayName ?? null,
      profileImageUrl: args.profileImageUrl ?? null,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken ?? null,
      tokenExpiresAt: args.tokenExpiresAt ?? null,
      scopes: args.scopes ?? [],
      metadata: args.metadata ?? {},
      status: SocialAccountStatus.CONNECTED,
      connectedAt: new Date(),
    });
  }

  async resolveWorkspaceId(userId: string, requestedWorkspaceId?: string | null): Promise<string> {
    return this.workspaceContext.resolveWorkspaceId(userId, requestedWorkspaceId ?? null);
  }

  private async upsertLinkedAccount(args: CreateSocialAccountInput): Promise<SocialAccountSafeResponse> {
    const now = new Date();
    const account = await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_platform_externalAccountId: {
          workspaceId: args.workspaceId,
          platform: args.platform,
          externalAccountId: args.externalAccountId,
        },
      },
      update: {
        username: args.username,
        displayName: args.displayName,
        profileImageUrl: args.profileImageUrl,
        accessTokenEncrypted: encryptValue(args.accessToken),
        refreshTokenEncrypted: args.refreshToken ? encryptValue(args.refreshToken) : undefined,
        tokenExpiresAt: args.tokenExpiresAt ?? null,
        scopes: args.scopes ?? [],
        status: args.status ?? SocialAccountStatus.CONNECTED,
        metadata: args.metadata ?? {},
        lastSyncedAt: now,
        connectedAt: args.connectedAt ?? now,
      },
      create: {
        workspaceId: args.workspaceId,
        platform: args.platform,
        externalAccountId: args.externalAccountId,
        username: args.username,
        displayName: args.displayName,
        profileImageUrl: args.profileImageUrl,
        accessTokenEncrypted: encryptValue(args.accessToken),
        refreshTokenEncrypted: args.refreshToken ? encryptValue(args.refreshToken) : null,
        tokenExpiresAt: args.tokenExpiresAt ?? null,
        scopes: args.scopes ?? [],
        status: args.status ?? SocialAccountStatus.CONNECTED,
        metadata: args.metadata ?? {},
        connectedAt: args.connectedAt ?? now,
        lastSyncedAt: now,
      },
    });

    return this.toSafeResponse(account);
  }

  public getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
    const adapter = this.adapters[platform];
    if (!adapter) {
      throw new BadRequestException(`No adapter found for platform: ${platform}`);
    }
    return adapter;
  }

  private decryptToken(encrypted: string): string {
    try {
      return decryptValue(encrypted);
    } catch {
      return encrypted;
    }
  }

  private toSafeResponse(account: {
    id: string;
    workspaceId: string;
    platform: SocialPlatform;
    externalAccountId: string;
    username: string | null;
    displayName: string | null;
    profileImageUrl: string | null;
    status: SocialAccountStatus;
    connectedAt: Date | null;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    scopes: Prisma.JsonValue | null;
    metadata: Prisma.JsonValue | null;
    accessTokenEncrypted: string | null;
    refreshTokenEncrypted: string | null;
  }): SocialAccountSafeResponse {
    return {
      id: account.id,
      workspaceId: account.workspaceId,
      platform: account.platform,
      externalAccountId: account.externalAccountId,
      username: account.username,
      displayName: account.displayName,
      profileImageUrl: account.profileImageUrl,
      status: account.status,
      connectedAt: account.connectedAt,
      lastSyncedAt: account.lastSyncedAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      scopes: account.scopes,
      metadata: account.metadata,
      hasToken: Boolean(account.accessTokenEncrypted),
    };
  }
}
