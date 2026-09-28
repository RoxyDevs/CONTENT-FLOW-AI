import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OauthService } from './oauth.service';

@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get(':platform/oauth/start')
  async startOAuth(
    @CurrentUser() user: { id: string },
    @Query('workspaceId') workspaceId?: string,
    @Param('platform') platform: string,
  ) {
    const url = await this.oauthService.getAuthorizationUrl(platform, workspaceId, user.id);

    return {
      platform,
      authorizationUrl: url,
      workspaceId: workspaceId ?? null,
    };
  }

  @Get(':platform/oauth/callback')
  async callback(
    @CurrentUser() user: { id: string },
    @Param('platform') platform: string,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('workspaceId') workspaceId?: string,
    @Res() res?: Response,
  ) {
    const callbackData = await this.oauthService.handleCallback({
      platform,
      code: code ?? '',
      workspaceId,
      state,
      userId: user.id,
    });

    if (res) {
      const redirectTarget = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      return res.redirect(`${redirectTarget}/integrations/callback?status=success`);
    }

    return callbackData;
  }
}
