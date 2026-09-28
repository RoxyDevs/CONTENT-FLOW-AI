import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PublicationJobLogService } from './publication-job-log.service';
import { PublicationJobPayload } from './publication-queue.service';
import { PublicationService } from './publication.service';

@Processor('publication')
@Injectable()
export class PublicationProcessor extends WorkerHost {
  private readonly logger = new Logger(PublicationProcessor.name);

  constructor(
    private readonly publicationService: PublicationService,
    private readonly jobLogService: PublicationJobLogService,
  ) {
    super();
  }

  async process(job: Job<PublicationJobPayload, unknown, string>): Promise<unknown> {
    const logId = (job.data.payload?.publicationJobLogId as string | undefined) ?? undefined;

    if (logId) {
      await this.jobLogService.updateStatus(logId, {
        status: 'RUNNING',
        startedAt: new Date(),
        attempts: job.attemptsMade + 1,
      });
    }

    const result = await this.publicationService.publishPost(
      job.data.workspaceId,
      job.data.postId,
      job.data.userId,
      logId,
    );

    return {
      success: true,
      ...result,
    };
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<PublicationJobPayload, unknown, string>, error: Error) {
    const logId = (job.data.payload?.publicationJobLogId as string | undefined) ?? undefined;

    if (logId) {
      await this.jobLogService.updateStatus(logId, {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: error.message,
      });
    }

    this.logger.error(`Publication job ${job.id} failed`, error.stack);
  }
}
