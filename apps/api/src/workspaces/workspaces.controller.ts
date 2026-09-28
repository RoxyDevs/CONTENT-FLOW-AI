import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Get(':workspaceId')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.findOne(user.id, workspaceId);
  }

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspacesService.create(user.id, dto);
  }

  @Put(':workspaceId')
  async update(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(user.id, workspaceId, dto);
  }

  @Delete(':workspaceId')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspacesService.remove(user.id, workspaceId);
  }
}
