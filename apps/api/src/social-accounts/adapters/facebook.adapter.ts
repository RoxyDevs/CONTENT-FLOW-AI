import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class FacebookAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.FACEBOOK;
}
