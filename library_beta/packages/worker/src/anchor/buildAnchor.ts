/**
 * Anchor Builder - Creates deterministic Style Bible for consistent video generation
 */

import crypto from 'crypto';
import { Anchor, StyleSignature, TypographyPlan, StoryboardPlan, SafetyConstraints } from '../shared/types';
import { GeminiProvider } from '../shared/types';

export class AnchorBuilder {
  constructor(private provider: GeminiProvider) {}

  /**
   * Build Anchor from title
   * This is the FIRST step before any scene generation
   */
  async buildAnchor(jobId: string, title: string, language: 'ko' | 'en'): Promise<Anchor> {
    // Generate anchor using Gemini
    const anchor = await this.provider.generateAnchor(title, language);

    // Validate and enhance
    anchor.jobId = jobId;
    anchor.createdAt = new Date().toISOString();

    // Compute consistency hash
    anchor.styleSignature.consistencyHash = this.computeStyleHash(anchor.styleSignature);

    // Validate safety constraints
    this.validateSafetyConstraints(anchor.safetyConstraints);

    return anchor;
  }

  /**
   * Compute deterministic hash of style parameters
   */
  private computeStyleHash(style: StyleSignature): string {
    const hashInput = JSON.stringify({
      visualStyle: style.visualStyle,
      colorPalette: style.colorPalette.sort(),
      mood: style.mood,
      cameraLanguage: style.cameraLanguage,
      genre: style.genre,
    });

    return crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');
  }

  /**
   * Validate safety constraints are properly defined
   */
  private validateSafetyConstraints(constraints: SafetyConstraints): void {
    if (!constraints.forbiddenThemes || constraints.forbiddenThemes.length === 0) {
      throw new Error('Safety constraints must include forbidden themes');
    }

    if (!constraints.forbiddenWords || constraints.forbiddenWords.length === 0) {
      throw new Error('Safety constraints must include forbidden words');
    }

    if (!constraints.requiredTone) {
      throw new Error('Safety constraints must specify required tone');
    }

    if (!constraints.targetAudience) {
      throw new Error('Safety constraints must specify target audience');
    }
  }

  /**
   * Get default safety constraints for children's content
   */
  static getDefaultSafetyConstraints(): SafetyConstraints {
    return {
      forbiddenThemes: [
        'horror',
        'violence',
        'death',
        'war',
        'politics',
        'adult content',
        'scary imagery',
        'gore',
        'weapons',
        'dark magic',
        'nightmares',
        'monsters',
        'ghosts',
        'zombies',
        'blood',
      ],
      forbiddenWords: [
        '죽음', '폭력', '무서운', '공포', '귀신', '좀비', '피', '전쟁',
        'death', 'kill', 'scary', 'horror', 'violence', 'blood', 'war', 'weapon',
        'ghost', 'zombie', 'monster', 'nightmare', 'dark', 'evil', 'demon',
      ],
      requiredTone: 'positive, uplifting, child-friendly, warm',
      targetAudience: 'children ages 5-12',
    };
  }

  /**
   * Get default typography plan for Korean/English
   */
  static getDefaultTypographyPlan(language: 'ko' | 'en'): TypographyPlan {
    return {
      subtitleRegion: {
        position: 'bottom',
        safeMargin: 80,
        maxLines: 2,
        maxCharsPerLine: language === 'ko' ? 40 : 50,
        fontSize: 22,
      },
      titleRegion: {
        position: 'center',
        displayDuration: 3,
        fontSize: 40,
      },
      fontFamily: language === 'ko' ? 'Noto Sans KR' : 'Roboto',
      fontWeight: 500,
      textColor: '#FFFFFF',
      outlineColor: '#000000',
    };
  }

  /**
   * Create storyboard template for 3 scenes
   */
  static createStoryboardTemplate(): StoryboardPlan {
    return {
      scenes: [
        {
          sceneNumber: 1,
          sceneType: 'intro',
          timeRange: [0, 8],
          keyframes: [
            { timestamp: 0, description: 'Book cover or title reveal', action: 'fade in' },
            { timestamp: 2, description: 'Title fully visible', action: 'hold' },
            { timestamp: 5, description: 'Transition to story world', action: 'zoom or pan' },
            { timestamp: 8, description: 'Story world established', action: 'fade out' },
          ],
          objective: 'Hook the viewer with title and visual style',
          visualFocus: 'Book cover with inviting imagery',
        },
        {
          sceneNumber: 2,
          sceneType: 'body',
          timeRange: [8, 16],
          keyframes: [
            { timestamp: 0, description: 'Main character or key moment', action: 'fade in' },
            { timestamp: 2, description: 'Character established', action: 'camera movement' },
            { timestamp: 5, description: 'Story action peaks', action: 'dynamic motion' },
            { timestamp: 8, description: 'Cliffhanger or intrigue', action: 'fade out' },
          ],
          objective: 'Reveal core story hook and main character',
          visualFocus: 'Main character in action or key story moment',
        },
        {
          sceneNumber: 3,
          sceneType: 'outro',
          timeRange: [16, 24],
          keyframes: [
            { timestamp: 0, description: 'Book floating or library setting', action: 'fade in' },
            { timestamp: 2, description: 'Call-to-action visible', action: 'text appears' },
            { timestamp: 5, description: 'Library branding shown', action: 'logo reveal' },
            { timestamp: 8, description: 'End card with availability', action: 'hold and fade' },
          ],
          objective: 'Call-to-action and library branding',
          visualFocus: 'Book available at library',
        },
      ],
    };
  }
}
