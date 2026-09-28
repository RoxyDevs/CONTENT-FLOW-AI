import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiContentService } from './ai-content.service';

@Module({
  imports: [PrismaModule],
  providers: [AiContentService],
  exports: [AiContentService],
})
export class AiContentModule {}
