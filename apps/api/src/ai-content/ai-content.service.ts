import { Injectable } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';

export type GeneratedVariantDraft = {
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  cta: string;
  platformMetadata?: Record<string, unknown>;
};

@Injectable()
export class AiContentService {
  generateVariantDraft(input: {
    platform: SocialPlatform;
    topic?: string;
    baseCaption?: string;
    brandTone?: string;
    language?: string;
  }): GeneratedVariantDraft {
    const platform = input.platform;
    const topic = input.topic ?? 'contenido de marca';
    const base = input.baseCaption ?? 'Comparte algo útil, auténtico y cercano con tu comunidad.';
    const tone = input.brandTone ?? 'claro y atractivo';
    const language = input.language ?? 'es';

    const uniqueHashTags = this.buildHashtags(platform, topic, language);
    const caption = this.buildCaption(platform, base, tone, topic, language);

    return {
      platform,
      caption,
      hashtags: uniqueHashTags,
      cta: this.buildCta(platform),
      platformMetadata: {
        source: 'ai-content-stub',
        generatedFrom: topic,
        language,
        tone,
      },
    };
  }

  private buildCaption(
    platform: SocialPlatform,
    base: string,
    tone: string,
    topic: string,
    language: string,
  ): string {
    const prefixByPlatform: Record<SocialPlatform, string> = {
      [SocialPlatform.INSTAGRAM]: '✨',
      [SocialPlatform.FACEBOOK]: '📣',
      [SocialPlatform.TIKTOK]: '🎬',
      [SocialPlatform.YOUTUBE]: '🎥',
      [SocialPlatform.LINKEDIN]: '💡',
      [SocialPlatform.X]: '🔔',
    };

    const normalizedTone = tone.toLowerCase();
    const intro = language === 'en' ? `Here’s a ${normalizedTone} take on ${topic}:` : `Aquí va una mirada ${normalizedTone} sobre ${topic}:`;

    return `${prefixByPlatform[platform]} ${intro} ${base}`;
  }

  private buildHashtags(platform: SocialPlatform, topic: string, language: string): string[] {
    const base = topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .join('');

    const platformTags: Record<SocialPlatform, string[]> = {
      [SocialPlatform.INSTAGRAM]: ['#instagram', '#contentcreator', '#marketing'],
      [SocialPlatform.FACEBOOK]: ['#facebook', '#community', '#brand'],
      [SocialPlatform.TIKTOK]: ['#tiktok', '#viralcontent', '#shortvideo'],
      [SocialPlatform.YOUTUBE]: ['#youtube', '#video', '#creator'],
      [SocialPlatform.LINKEDIN]: ['#linkedin', '#strategy', '#growth'],
      [SocialPlatform.X]: ['#x', '#socialmedia', '#engagement'],
    };

    const topicTags = base ? [`#${base}`] : [];
    const langTags = language === 'en' ? ['#marketingtips'] : ['#marketingtips'];

    return [...new Set([...platformTags[platform], ...topicTags, ...langTags])].slice(0, 5);
  }

  private buildCta(platform: SocialPlatform): string {
    const ctas: Record<SocialPlatform, string> = {
      [SocialPlatform.INSTAGRAM]: 'Guarda esta idea para usarla en tu próxima publicación.',
      [SocialPlatform.FACEBOOK]: 'Comenta con tu comunidad qué te gustaría ver más.',
      [SocialPlatform.TIKTOK]: 'Síguenos para más ideas rápidas y útiles.',
      [SocialPlatform.YOUTUBE]: 'Suscríbete para descubrir más estrategias de contenido.',
      [SocialPlatform.LINKEDIN]: 'Comparte esta idea con tu red profesional.',
      [SocialPlatform.X]: 'Responde y comparte tu opinión con la comunidad.',
    };

    return ctas[platform];
  }
}
