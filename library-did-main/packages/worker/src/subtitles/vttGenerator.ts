/**
 * VTT Subtitle Generator
 * Generates WebVTT subtitles with proper timing and typography rules
 */

import { SceneScript, TypographyPlan } from '../shared/types';
import typographyRules from '../qc/typographyRules.json';

/** typographyRules.json uses 'korean' | 'english' keys */
function toRulesKey(language: 'ko' | 'en'): 'korean' | 'english' {
  return language === 'ko' ? 'korean' : 'english';
}

export class VTTGenerator {
  /**
   * Generate VTT subtitle file from scene scripts
   */
  generateVTT(scripts: SceneScript[], typographyPlan: TypographyPlan, language: 'ko' | 'en'): string {
    const rules = typographyRules[toRulesKey(language)];

    const vttContent: string[] = ['WEBVTT', ''];

    let cueNumber = 1;

    scripts.forEach((script) => {
      // Calculate timing for this scene
      const startTime = (script.sceneNumber - 1) * 8; // 0, 8, 16
      const endTime = startTime + 8; // 8, 16, 24

      // Build subtitle text
      const subtitleText = this.buildSubtitleText(script, rules.maxCharsPerLine);

      // Add cue
      vttContent.push(cueNumber.toString());
      vttContent.push(`${this.formatTime(startTime)} --> ${this.formatTime(endTime)}`);

      // Add voice tag if character dialogue
      if (script.characterDialogue && script.characterName) {
        vttContent.push(`<v ${script.characterName}>${subtitleText}`);
      } else {
        vttContent.push(`<v 나레이터>${subtitleText}`);
      }

      vttContent.push(''); // Empty line between cues
      cueNumber++;
    });

    return vttContent.join('\n');
  }

  /**
   * Build subtitle text (narration + dialogue if present)
   */
  private buildSubtitleText(script: SceneScript, maxCharsPerLine: number): string {
    const parts: string[] = [];

    if (script.narration) {
      parts.push(script.narration);
    }

    if (script.characterDialogue) {
      parts.push(script.characterDialogue);
    }

    const fullText = parts.join(' ');

    // Check length and break into lines if needed
    return this.breakIntoLines(fullText, maxCharsPerLine);
  }

  /**
   * Break text into lines respecting max characters per line
   */
  private breakIntoLines(text: string, maxCharsPerLine: number): string {
    if (text.length <= maxCharsPerLine) {
      return text;
    }

    // Split by spaces
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Format time in VTT format (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':') + '.' + milliseconds.toString().padStart(3, '0');
  }

  /**
   * Validate subtitle length before generation
   */
  validateLength(scripts: SceneScript[], language: 'ko' | 'en'): {
    valid: boolean;
    violations: string[];
  } {
    const rules = typographyRules[toRulesKey(language)];
    const violations: string[] = [];

    const maxTotalChars = rules.maxCharsPerLine * rules.maxLines;

    scripts.forEach((script) => {
      const text = [script.narration, script.characterDialogue || ''].join(' ').trim();

      if (text.length > maxTotalChars) {
        violations.push(
          `Scene ${script.sceneNumber}: Text too long (${text.length} chars, max ${maxTotalChars})`
        );
      }
    });

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Shorten text to fit within limits (emergency fallback)
   */
  shortenText(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    // Try to cut at sentence boundary
    const sentences = text.split(/[.!?]/);
    let shortened = '';

    for (const sentence of sentences) {
      if ((shortened + sentence).length <= maxChars - 3) {
        shortened += sentence + '.';
      } else {
        break;
      }
    }

    if (shortened.length === 0) {
      // No sentence fit, just truncate
      shortened = text.substring(0, maxChars - 3) + '...';
    }

    return shortened.trim();
  }

  /**
   * Generate SRT format (alternative to VTT)
   */
  generateSRT(scripts: SceneScript[], typographyPlan: TypographyPlan, language: 'ko' | 'en'): string {
    const rules = typographyRules[toRulesKey(language)];
    const srtContent: string[] = [];

    let cueNumber = 1;

    scripts.forEach((script) => {
      const startTime = (script.sceneNumber - 1) * 8;
      const endTime = startTime + 8;

      const subtitleText = this.buildSubtitleText(script, rules.maxCharsPerLine);

      srtContent.push(cueNumber.toString());
      srtContent.push(`${this.formatTimeSRT(startTime)} --> ${this.formatTimeSRT(endTime)}`);
      srtContent.push(subtitleText);
      srtContent.push(''); // Empty line

      cueNumber++;
    });

    return srtContent.join('\n');
  }

  /**
   * Format time in SRT format (HH:MM:SS,mmm)
   */
  private formatTimeSRT(seconds: number): string {
    return this.formatTime(seconds).replace('.', ',');
  }
}
