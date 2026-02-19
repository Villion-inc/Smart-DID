/**
 * Safety Gate Agent (QC Agent 3)
 * Zero-tolerance safety enforcement for children's content
 */

import { SafetyQCResult, SceneScript, SafetyConstraints } from '../shared/types';
import safetyKeywords from './safetyKeywords.json';

export class SafetyGate {
  /**
   * Validate safety - must return perfect score (1.0) to pass
   */
  validate(scripts: SceneScript[], constraints: SafetyConstraints): SafetyQCResult {
    const violations: string[] = [];
    const forbiddenWordsFound: string[] = [];
    const themeViolations: string[] = [];

    // Combine all forbidden words from config and constraints
    const allForbiddenWords = [
      ...safetyKeywords.forbiddenWordsKorean,
      ...safetyKeywords.forbiddenWordsEnglish,
      ...constraints.forbiddenWords,
    ].map(w => w.toLowerCase());

    const allForbiddenThemes = [
      ...safetyKeywords.forbiddenThemes,
      ...constraints.forbiddenThemes,
    ].map(t => t.toLowerCase());

    // Check each scene
    scripts.forEach((script) => {
      const allText = [
        script.narration,
        script.characterDialogue || '',
        script.visualDescription,
        script.keyframePrompt,
        script.videoPrompt,
      ].join(' ').toLowerCase();

      // Check for forbidden words
      allForbiddenWords.forEach((word) => {
        if (allText.includes(word)) {
          forbiddenWordsFound.push(word);
          violations.push(`Scene ${script.sceneNumber}: Forbidden word "${word}" found`);
        }
      });

      // Check for forbidden themes
      allForbiddenThemes.forEach((theme) => {
        if (allText.includes(theme)) {
          themeViolations.push(theme);
          violations.push(`Scene ${script.sceneNumber}: Forbidden theme "${theme}" detected`);
        }
      });
    });

    // Check tone (simplified sentiment check)
    const toneScore = this.calculateToneScore(scripts);

    // Visual safety flags (placeholder - would use actual image analysis in production)
    const visualSafetyFlags: string[] = [];

    // Safety score: 1.0 if no violations, 0.0 if any violations
    const score = violations.length === 0 && toneScore >= 0.7 ? 1.0 : 0.0;

    return {
      status: score === 1.0 ? 'PASS' : 'FAIL',
      score,
      forbiddenWordsFound: [...new Set(forbiddenWordsFound)],
      themeViolations: [...new Set(themeViolations)],
      toneScore,
      visualSafetyFlags,
    };
  }

  /**
   * Calculate tone score based on positive/negative word presence
   */
  private calculateToneScore(scripts: SceneScript[]): number {
    const allText = scripts
      .map(s => [s.narration, s.characterDialogue || '', s.visualDescription].join(' '))
      .join(' ')
      .toLowerCase();

    // Count positive words
    const positiveCount = safetyKeywords.requiredPositiveWords
      .filter(word => allText.includes(word.toLowerCase()))
      .length;

    // Count negative indicators
    const negativeIndicators = ['sad', 'cry', 'angry', 'scary', 'dark', '슬픈', '무서운'];
    const negativeCount = negativeIndicators
      .filter(word => allText.includes(word))
      .length;

    // Simple scoring: positive words boost, negative words reduce
    const rawScore = (positiveCount * 0.1) - (negativeCount * 0.2) + 0.5;
    return Math.max(0, Math.min(1, rawScore));
  }

  /**
   * Get safety constraints with stronger prompts for retry
   */
  static getStrongerConstraints(originalConstraints: SafetyConstraints, retryCount: number): SafetyConstraints {
    return {
      ...originalConstraints,
      requiredTone: `EXTREMELY ${originalConstraints.requiredTone}, NO scary or dark elements whatsoever (retry ${retryCount})`,
      forbiddenThemes: [
        ...originalConstraints.forbiddenThemes,
        'anything remotely scary',
        'any dark imagery',
        'any violence or conflict',
      ],
    };
  }
}
