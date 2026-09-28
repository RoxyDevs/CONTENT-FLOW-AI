import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { PostsModule } from './posts/posts.module';
import { MediaAssetsModule } from './modules/media-assets/media-assets.module';
import { AiModule } from './modules/ai/ai.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    WorkspacesModule,
    SocialAccountsModule,
    PostsModule,
    MediaAssetsModule,
    AiModule,
    SchedulerModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
