import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicationJobLogResponseMapper } from './mappers/publication-job-log-response.mapper';

export type PublicationJobStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

@Injectable()
export class PublicationJobLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    workspaceId: string;
    postId: string;
    jobName: string;
    queueName?: string;
    status?: PublicationJobStatus;
    scheduledAt?: Date | null;
    runAt?: Date | null;
    payload?: Record<string, unknown>;
  }) {
    return this.prisma.publicationJobLog.create({
      data: {
        workspaceId: data.workspaceId,
        postId: data.postId,
        jobName: data.jobName,
        queueName: data.queueName ?? 'publication',
        status: data.status ?? 'PENDING',
        scheduledAt: data.scheduledAt ?? null,
        runAt: data.runAt ?? null,
        payload: data.payload ? (data.payload as Prisma.JsonObject) : Prisma.JsonNull,
      },
    });
  }

  async updateStatus(
    id: string,
    updates: {
      status?: PublicationJobStatus;
      attempts?: number;
      startedAt?: Date | null;
      finishedAt?: Date | null;
      errorMessage?: string | null;
      runAt?: Date | null;
    },
  ) {
    return this.prisma.publicationJobLog.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  async findByPost(postId: string) {
    const logs = await this.prisma.publicationJobLog.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => PublicationJobLogResponseMapper.toResponse(log));
  }

  async findLatestForPost(postId: string) {
    const log = await this.prisma.publicationJobLog.findFirst({
      where: { postId },
      orderBy: { createdAt: 'desc' },
    });

    return log ? PublicationJobLogResponseMapper.toResponse(log) : null;
  }
}
