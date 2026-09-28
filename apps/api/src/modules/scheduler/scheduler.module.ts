import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkspaceContextService } from '../../common/workspace/workspace-context.service';
import { SocialAccountsModule } from '../../social-accounts/social-accounts.module';
import { SchedulerController } from './scheduler.controller';
import { PublicationQueueService } from './publication-queue.service';
import { PublicationProcessor } from './publication.processor';
import { PublicationSchedulerService } from './publication-scheduler.service';
import { PublicationJobLogService } from './publication-job-log.service';
import { PublicationService } from './publication.service';

@Module({
  imports: [
    PrismaModule,
    SocialAccountsModule,
    BullModule.registerQueue({ name: 'publication' }),
  ],
  controllers: [SchedulerController],
  providers: [
    WorkspaceContextService,
    PublicationQueueService,
    PublicationService,
    PublicationProcessor,
    PublicationSchedulerService,
    PublicationJobLogService,
  ],
  exports: [PublicationQueueService, PublicationSchedulerService, PublicationJobLogService, PublicationService],
})
export class SchedulerModule {}
