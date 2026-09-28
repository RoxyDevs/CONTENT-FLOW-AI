import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceContextService } from '../common/workspace/workspace-context.service';

@Module({
  imports: [PrismaModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspaceContextService],
  exports: [WorkspacesService, WorkspaceContextService],
})
export class WorkspacesModule {}
