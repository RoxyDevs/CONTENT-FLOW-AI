import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { ListMediaAssetsQueryDto } from './dto/list-media-assets-query.dto';
import { MediaAssetsService } from './media-assets.service';

@UseGuards(JwtAuthGuard)
@Controller('media-assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMediaAssetDto,
  ) {
    return this.mediaAssetsService.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() query: ListMediaAssetsQueryDto,
  ) {
    return this.mediaAssetsService.findAll(user.id, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.mediaAssetsService.findOne(user.id, id);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.mediaAssetsService.remove(user.id, id);
  }
}
