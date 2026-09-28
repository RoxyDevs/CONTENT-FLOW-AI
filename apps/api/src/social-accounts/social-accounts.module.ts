import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceContextService } from '../common/workspace/workspace-context.service';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';
import { InstagramAdapter } from './adapters/instagram.adapter';
import { FacebookAdapter } from './adapters/facebook.adapter';
import { TikTokAdapter } from './adapters/tiktok.adapter';
import { YouTubeAdapter } from './adapters/youtube.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { XAdapter } from './adapters/x.adapter';
import { OauthController } from './oauth/oauth.controller';
import { OauthService } from './oauth/oauth.service';
import { SocialPlatformAdapter } from './adapters/social-platform.adapter';
import { SocialPlatform } from '@prisma/client';

const socialPlatformProviders = [InstagramAdapter, FacebookAdapter, TikTokAdapter, YouTubeAdapter, LinkedInAdapter, XAdapter];

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SocialAccountsController, OauthController],
  providers: [
    WorkspaceContextService,
    SocialAccountsService,
    OauthService,
    ...socialPlatformProviders,
    {
      provide: 'SOCIAL_PLATFORM_ADAPTERS',
      useFactory: (configService: ConfigService): Record<string, SocialPlatformAdapter> => ({
        [SocialPlatform.INSTAGRAM]: new InstagramAdapter(configService),
        [SocialPlatform.FACEBOOK]: new FacebookAdapter(configService),
        [SocialPlatform.TIKTOK]: new TikTokAdapter(configService),
        [SocialPlatform.YOUTUBE]: new YouTubeAdapter(configService),
        [SocialPlatform.LINKEDIN]: new LinkedInAdapter(configService),
        [SocialPlatform.X]: new XAdapter(configService),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [SocialAccountsService, OauthService],
})
export class SocialAccountsModule {}
