import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class LinkedInAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.LINKEDIN;
}
