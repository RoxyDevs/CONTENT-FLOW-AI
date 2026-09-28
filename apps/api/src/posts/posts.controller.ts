import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorkspaceContextService } from '../common/workspace/workspace-context.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { GenerateVariantDto } from './dto/generate-variant.dto';
import { GeneratePostVariantsDto } from './dto/generate-post-variants.dto';
import { AttachMediaToPostDto } from './dto/attach-media-to-post.dto';
import { PostsService } from './posts.service';

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: string,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.findAll(workspaceId, status);
  }

  @Get(':id')
  async findOne(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.findOne(workspaceId, id);
  }

  @Post()
  async create(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePostDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.create(workspaceId, user.id, dto);
  }

  @Post(':id/media')
  async attachMedia(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') postId: string,
    @Body() dto: AttachMediaToPostDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.attachMediaAsset(user.id, workspaceId, postId, dto.mediaAssetId);
  }

  @Post('generate-variant')
  async generateVariant(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: GenerateVariantDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.generateVariant(user.id, workspaceId, dto);
  }

  @Post(':id/generate-variants')
  async generateVariants(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') postId: string,
    @Body() dto: GeneratePostVariantsDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.generateVariantsForPost(user.id, workspaceId, postId, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.update(workspaceId, id, dto, user.id);
  }

  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string; email: string; name: string };
    await this.workspaceContext.assertUserHasWorkspaceAccess(user.id, workspaceId);
    return this.postsService.remove(workspaceId, id, user.id);
  }
}
