import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class TikTokAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.TIKTOK;
}
