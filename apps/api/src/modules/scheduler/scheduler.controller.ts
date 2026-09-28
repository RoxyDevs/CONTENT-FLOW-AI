import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceContextService } from '../../common/workspace/workspace-context.service';
import { SchedulePublicationDto } from './dto/schedule-publication.dto';
import { PublishNowDto } from './dto/publish-now.dto';
import { CancelPublicationDto } from './dto/cancel-publication.dto';
import { PublicationSchedulerService } from './publication-scheduler.service';
import { PublicationJobLogService } from './publication-job-log.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/posts/:postId')
export class SchedulerController {
  constructor(
    private readonly scheduleService: PublicationSchedulerService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly publicationJobLogService: PublicationJobLogService,
  ) {}

  @Post('schedule')
  async schedulePublication(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: SchedulePublicationDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);

    return this.scheduleService.schedulePublication(
      workspaceId,
      postId,
      user.id,
      new Date(dto.scheduledAt),
      dto.jobName,
    );
  }

  @Post('publish-now')
  async publishNow(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: PublishNowDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);

    return this.scheduleService.publishNow(workspaceId, postId, user.id, dto.jobName);
  }

  @Post('cancel-schedule')
  async cancelSchedule(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() _dto: CancelPublicationDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);

    return this.scheduleService.cancelScheduledPublication(workspaceId, postId);
  }

  @Get('publication-jobs')
  async getPublicationJobs(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);

    return this.publicationJobLogService.findByPost(postId);
  }
}
