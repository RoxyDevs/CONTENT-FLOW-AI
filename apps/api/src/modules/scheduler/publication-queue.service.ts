import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export type PublicationJobPayload = {
  workspaceId: string;
  postId: string;
  userId: string;
  jobName: string;
  scheduledAt?: Date | null;
  payload?: Record<string, unknown>;
};

@Injectable()
export class PublicationQueueService {
  private readonly queue: Queue<PublicationJobPayload>;

  constructor(private readonly configService: ConfigService) {
    this.queue = new Queue<PublicationJobPayload>('publication', {
      connection: {
        url: this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
      },
    });
  }

  async enqueuePublication(payload: PublicationJobPayload, delayMs?: number) {
    const jobOptions = delayMs && delayMs > 0 ? { delay: delayMs } : undefined;

    return this.queue.add('publish-post', payload, {
      ...jobOptions,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async cancelJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
    return { success: true, jobId };
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
