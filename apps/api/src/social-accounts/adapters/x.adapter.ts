import { SocialPlatform } from '@prisma/client';
import { BaseSocialPlatformAdapter } from './social-platform.adapter';

export class XAdapter extends BaseSocialPlatformAdapter {
  readonly platform = SocialPlatform.X;
}
