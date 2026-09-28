import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';

export type AiCaptionVariant = {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  cta: string;
};

@Injectable()
export class AiContentService {
  generateCaptionVariants(baseCaption: string, platforms: SocialPlatform[]): AiCaptionVariant[] {
    if (!baseCaption || !baseCaption.trim()) {
      throw new Error('baseCaption is required to generate social variants');
    }

    return platforms.map((platform) => {
      const caption = this.buildCaption(baseCaption, platform);

      return {
        platform,
        caption,
        hashtags: this.suggestHashtags(baseCaption, platform),
        cta: this.suggestCta(baseCaption, platform),
      };
    });
  }

  suggestHashtags(baseCaption: string, platform: SocialPlatform): string[] {
    const words = baseCaption
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 4);

    const platformHashtags: Record<SocialPlatform, string[]> = {
      [SocialPlatform.INSTAGRAM]: ['#instagram', '#contentcreator', '#creativebrand'],
      [SocialPlatform.FACEBOOK]: ['#facebook', '#community', '#brandstory'],
      [SocialPlatform.TIKTOK]: ['#tiktok', '#shortvideo', '#trendingcontent'],
      [SocialPlatform.YOUTUBE]: ['#youtube', '#video', '#creatorgrowth'],
      [SocialPlatform.LINKEDIN]: ['#linkedin', '#marketing', '#professionalgrowth'],
      [SocialPlatform.X]: ['#x', '#socialstrategy', '#brandvoice'],
    };

    const derived = words.map((word) => `#${word}`);
    return Array.from(new Set([...platformHashtags[platform], ...derived])).slice(0, 5);
  }

  suggestCta(baseCaption: string, platform: SocialPlatform): string {
    const label = baseCaption.trim();

    const ctas: Record<SocialPlatform, string> = {
      [SocialPlatform.INSTAGRAM]: `Guarda esta idea para usarla en tu próxima publicación y comenta qué te gustaría ver más.${label ? '' : ''}`,
      [SocialPlatform.FACEBOOK]: 'Comparte esta idea con tu comunidad y cuéntanos qué te gustaría descubrir después.',
      [SocialPlatform.TIKTOK]: 'Síguenos para más ideas creativas que puedas usar hoy mismo.',
      [SocialPlatform.YOUTUBE]: 'Suscríbete y activa la campanita para ver más contenido estratégico.',
      [SocialPlatform.LINKEDIN]: 'Comparte esta perspectiva con tu red y dime qué te parece en comentarios.',
      [SocialPlatform.X]: 'Responde con tu opinión y comparte esta idea con tu comunidad.',
    };

    return ctas[platform];
  }

  private buildCaption(baseCaption: string, platform: SocialPlatform): string {
    const normalized = baseCaption.trim();

    const openingByPlatform: Record<SocialPlatform, string> = {
      [SocialPlatform.INSTAGRAM]: '✨',
      [SocialPlatform.FACEBOOK]: '📣',
      [SocialPlatform.TIKTOK]: '🎬',
      [SocialPlatform.YOUTUBE]: '🎥',
      [SocialPlatform.LINKEDIN]: '💡',
      [SocialPlatform.X]: '🔔',
    };

    const toneByPlatform: Record<SocialPlatform, string> = {
      [SocialPlatform.INSTAGRAM]: 'un estilo visual y emocional',
      [SocialPlatform.FACEBOOK]: 'un enfoque cercano y conversacional',
      [SocialPlatform.TIKTOK]: 'un tono dinámico y directo',
      [SocialPlatform.YOUTUBE]: 'una versión clara y descriptiva',
      [SocialPlatform.LINKEDIN]: 'una versión profesional y útil',
      [SocialPlatform.X]: 'una versión breve y contundente',
    };

    return `${openingByPlatform[platform]} ${toneByPlatform[platform]} para esta idea: ${normalized}`;
  }
}
