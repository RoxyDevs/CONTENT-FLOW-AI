import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicationQueueService } from './publication-queue.service';
import { PublicationJobLogService } from './publication-job-log.service';

@Injectable()
export class PublicationSchedulerService {
  private readonly logger = new Logger(PublicationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: PublicationQueueService,
    private readonly jobLogService: PublicationJobLogService,
  ) {}

  async schedulePublication(workspaceId: string, postId: string, userId: string, scheduledAt: Date, jobName?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledAt must be in the future');
    }

    const jobLog = await this.jobLogService.create({
      workspaceId,
      postId,
      jobName: jobName ?? 'publish-post',
      scheduledAt,
      payload: { userId, scheduledAt: scheduledAt.toISOString() },
      status: 'PENDING',
    });

    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
    const queuedJob = await this.queueService.enqueuePublication(
      {
        workspaceId,
        postId,
        userId,
        jobName: jobLog.jobName,
        scheduledAt,
        payload: { publicationJobLogId: jobLog.id },
      },
      delayMs,
    );

    await this.jobLogService.updateStatus(jobLog.id, {
      status: 'PENDING',
      runAt: null,
      startedAt: null,
      finishedAt: null,
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
      },
    });

    return {
      success: true,
      postId,
      jobId: queuedJob.id,
      publicationJobLogId: jobLog.id,
      scheduledAt,
    };
  }

  async publishNow(workspaceId: string, postId: string, userId: string, jobName?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    const jobLog = await this.jobLogService.create({
      workspaceId,
      postId,
      jobName: jobName ?? 'publish-post',
      payload: { userId, immediate: true },
      status: 'PENDING',
    });

    const queuedJob = await this.queueService.enqueuePublication({
      workspaceId,
      postId,
      userId,
      jobName: jobLog.jobName,
      payload: { publicationJobLogId: jobLog.id },
    });

    return {
      success: true,
      postId,
      jobId: queuedJob.id,
      publicationJobLogId: jobLog.id,
    };
  }

  async cancelScheduledPublication(workspaceId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      throw new NotFoundException('Post not found in this workspace');
    }

    const latestLog = await this.jobLogService.findLatestForPost(postId);

    if (latestLog) {
      await this.jobLogService.updateStatus(latestLog.id, {
        status: 'CANCELED',
        finishedAt: new Date(),
      });
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: 'CANCELED',
        scheduledAt: null,
      },
    });

    return { success: true, postId, canceled: true };
  }
}
