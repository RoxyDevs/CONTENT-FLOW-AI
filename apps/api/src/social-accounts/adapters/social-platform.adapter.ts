import { SocialPlatform } from '@prisma/client';

export type SocialTokenExchangeResult = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
  scopes?: string[];
  raw?: Record<string, unknown>;
};

export type SocialProfile = {
  externalAccountId: string;
  username?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  validateConfig(): boolean;
  getAuthorizationUrl(options: {
    state?: string;
    redirectUri?: string;
    scopes?: string[];
    workspaceId?: string;
    userId?: string;
  }): string;
  exchangeCodeForToken(code: string, redirectUri?: string): Promise<SocialTokenExchangeResult>;
  refreshToken(refreshToken: string): Promise<SocialTokenExchangeResult>;
  getProfile(accessToken: string): Promise<SocialProfile>;
  publishPost?(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export abstract class BaseSocialPlatformAdapter implements SocialPlatformAdapter {
  abstract readonly platform: SocialPlatform;

  constructor(protected readonly config: { get: (key: string) => string | undefined }) {}

  protected getEnvKeys(): { clientId: string; clientSecret: string; redirectUri: string; baseUrl: string } {
    const platformKey = this.platform;
    const envMap: Record<string, { clientId: string; clientSecret: string; redirectUri: string; baseUrl: string }> = {
      [SocialPlatform.INSTAGRAM]: {
        clientId: 'INSTAGRAM_CLIENT_ID',
        clientSecret: 'INSTAGRAM_CLIENT_SECRET',
        redirectUri: 'INSTAGRAM_REDIRECT_URI',
        baseUrl: 'INSTAGRAM_OAUTH_BASE_URL',
      },
      [SocialPlatform.FACEBOOK]: {
        clientId: 'META_APP_ID',
        clientSecret: 'META_APP_SECRET',
        redirectUri: 'META_REDIRECT_URI',
        baseUrl: 'META_OAUTH_BASE_URL',
      },
      [SocialPlatform.TIKTOK]: {
        clientId: 'TIKTOK_CLIENT_ID',
        clientSecret: 'TIKTOK_CLIENT_SECRET',
        redirectUri: 'TIKTOK_REDIRECT_URI',
        baseUrl: 'TIKTOK_OAUTH_BASE_URL',
      },
      [SocialPlatform.YOUTUBE]: {
        clientId: 'GOOGLE_CLIENT_ID',
        clientSecret: 'GOOGLE_CLIENT_SECRET',
        redirectUri: 'GOOGLE_REDIRECT_URI',
        baseUrl: 'GOOGLE_OAUTH_BASE_URL',
      },
      [SocialPlatform.LINKEDIN]: {
        clientId: 'LINKEDIN_CLIENT_ID',
        clientSecret: 'LINKEDIN_CLIENT_SECRET',
        redirectUri: 'LINKEDIN_REDIRECT_URI',
        baseUrl: 'LINKEDIN_OAUTH_BASE_URL',
      },
      [SocialPlatform.X]: {
        clientId: 'X_CLIENT_ID',
        clientSecret: 'X_CLIENT_SECRET',
        redirectUri: 'X_REDIRECT_URI',
        baseUrl: 'X_OAUTH_BASE_URL',
      },
    };

    return envMap[platformKey];
  }

  validateConfig(): boolean {
    const keys = this.getEnvKeys();
    return Boolean(keys.clientId && keys.clientSecret && keys.redirectUri);
  }

  getAuthorizationUrl(options: {
    state?: string;
    redirectUri?: string;
    scopes?: string[];
    workspaceId?: string;
    userId?: string;
  }): string {
    const keys = this.getEnvKeys();
    const baseUrl = this.config.get(keys.baseUrl) ?? 'https://example.com/oauth';
    const clientId = this.config.get(keys.clientId) ?? 'dev-client-id';
    const redirectUri = options.redirectUri ?? this.config.get(keys.redirectUri) ?? 'http://localhost:3000/integrations/oauth/callback';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: (options.scopes ?? ['basic']).join(' '),
      state: options.state ?? 'dev-state',
    });

    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<SocialTokenExchangeResult> {
    const keys = this.getEnvKeys();
    const clientId = this.config.get(keys.clientId);
    const clientSecret = this.config.get(keys.clientSecret);
    const targetRedirectUri = redirectUri ?? this.config.get(keys.redirectUri);

    if (!clientId || !clientSecret || !targetRedirectUri) {
      return {
        accessToken: `dev-${this.platform.toLowerCase()}-access-token-${code}`,
        refreshToken: `dev-${this.platform.toLowerCase()}-refresh-token-${code}`,
        expiresIn: 3600,
        scopes: ['basic'],
        raw: {
          platform: this.platform,
          mode: 'placeholder',
          note: 'OAuth config not complete yet; used for local development only.',
        },
      };
    }

    return {
      accessToken: `mock-access-token-${code}`,
      refreshToken: `mock-refresh-token-${code}`,
      expiresIn: 3600,
      scopes: ['basic'],
      raw: {
        platform: this.platform,
        code,
        redirectUri: targetRedirectUri,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<SocialTokenExchangeResult> {
    return {
      accessToken: `refreshed-${this.platform.toLowerCase()}-token`,
      refreshToken,
      expiresIn: 3600,
      scopes: ['basic'],
      raw: {
        platform: this.platform,
        refreshToken,
        mode: 'placeholder',
      },
    };
  }

  async getProfile(accessToken: string): Promise<SocialProfile> {
    return {
      externalAccountId: `${this.platform.toLowerCase()}-account-${accessToken.slice(0, 8)}`,
      username: `${this.platform.toLowerCase()}_dev_user`,
      displayName: `${this.platform} Developer Account`,
      profileImageUrl: 'https://placehold.co/200x200/png',
      metadata: {
        platform: this.platform,
        profileSource: 'placeholder',
      },
    };
  }
}
