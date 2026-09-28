import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { MediaAssetsController } from './media-assets.controller';
import { MediaAssetsService } from './media-assets.service';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [MediaAssetsController],
  providers: [MediaAssetsService],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}
