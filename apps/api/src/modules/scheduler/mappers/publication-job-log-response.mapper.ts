import { PublicationJobStatus } from '../publication-job-log.service';

export type PublicationJobLogResponse = {
  id: string;
  workspaceId: string;
  postId: string;
  status: PublicationJobStatus;
  jobName: string;
  queueName: string;
  scheduledAt: Date | null;
  runAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  attempts: number;
  payload: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class PublicationJobLogResponseMapper {
  static toResponse(log: {
    id: string;
    workspaceId: string;
    postId: string;
    status: PublicationJobStatus;
    jobName: string;
    queueName: string;
    scheduledAt: Date | null;
    runAt: Date | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    attempts: number;
    payload: Record<string, unknown> | null;
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PublicationJobLogResponse {
    return {
      id: log.id,
      workspaceId: log.workspaceId,
      postId: log.postId,
      status: log.status,
      jobName: log.jobName,
      queueName: log.queueName,
      scheduledAt: log.scheduledAt,
      runAt: log.runAt,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
      attempts: log.attempts,
      payload: log.payload,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }
}
