import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class InstagramAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.INSTAGRAM;
}
