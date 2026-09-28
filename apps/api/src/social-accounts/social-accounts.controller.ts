import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import { SyncSocialAccountDto } from './dto/sync-social-account.dto';
import { SocialAccountsService } from './social-accounts.service';
import { SocialAccountStatus, SocialPlatform } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query('platform') platform?: string,
    @Query('status') status?: string,
  ) {
    return this.socialAccountsService.findAll(user.id, {
      platform: platform ? (platform.toUpperCase() as SocialPlatform) : undefined,
      status: status ? (status.toUpperCase() as SocialAccountStatus) : undefined,
    });
  }

  @Get(':id')
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.socialAccountsService.findOne(user.id, id);
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSocialAccountDto,
  ) {
    return this.socialAccountsService.connectManualAccount(user.id, dto);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSocialAccountDto,
  ) {
    return this.socialAccountsService.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.socialAccountsService.remove(user.id, id);
  }

  @Post(':id/refresh-token')
  async refreshToken(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.socialAccountsService.refreshToken(user.id, id);
  }

  @Post(':id/sync')
  async sync(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SyncSocialAccountDto,
  ) {
    return this.socialAccountsService.sync(user.id, id, dto);
  }
}
