import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class YouTubeAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.YOUTUBE;
}
