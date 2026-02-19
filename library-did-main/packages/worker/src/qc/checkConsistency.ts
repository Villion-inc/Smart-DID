/**
 * Visual Consistency QC Agent (QC Agent 2)
 * Validates scenes against Anchor's styleSignature and checks scene-to-scene consistency
 */

import { ConsistencyQCResult, SceneScript, Anchor, StyleSignature } from '../shared/types';
import crypto from 'crypto';

export class ConsistencyChecker {
  /**
   * Validate consistency against Anchor and between scenes
   */
  validate(scripts: SceneScript[], anchor: Anchor): ConsistencyQCResult {
    const violations: string[] = [];

    // 1. Check Anchor match (do scenes reference the Anchor's style?)
    const anchorMatchScore = this.checkAnchorMatch(scripts, anchor);
    if (anchorMatchScore < 0.75) {
      violations.push(`Anchor match score too low: ${anchorMatchScore.toFixed(2)} (min 0.75)`);
    }

    // 2. Check scene-to-scene consistency
    const sceneConsistency = this.checkSceneToSceneConsistency(scripts);
    if (sceneConsistency < 0.80) {
      violations.push(`Scene-to-scene consistency too low: ${sceneConsistency.toFixed(2)} (min 0.80)`);
    }

    // 3. Check color palette drift
    const colorDrift = this.checkColorPaletteDrift(scripts, anchor.styleSignature);
    if (colorDrift > 0.20) {
      violations.push(`Color palette drift too high: ${colorDrift.toFixed(2)} (max 0.20)`);
    }

    // 4. Check style signature match
    const styleMatch = this.checkStyleSignatureMatch(scripts, anchor.styleSignature);
    if (!styleMatch) {
      violations.push('Style signature does not match across all scenes');
    }

    // Calculate overall consistency score
    const score = (anchorMatchScore + sceneConsistency + (1 - colorDrift)) / 3;

    return {
      status: violations.length === 0 ? 'PASS' : 'FAIL',
      score,
      anchorMatch: anchorMatchScore,
      sceneToSceneConsistency: sceneConsistency,
      colorPaletteDrift: colorDrift,
      styleSignatureMatch: styleMatch,
      violations,
    };
  }

  /**
   * Check how well scenes match the Anchor's style
   */
  private checkAnchorMatch(scripts: SceneScript[], anchor: Anchor): number {
    const styleKeywords = [
      anchor.styleSignature.visualStyle,
      anchor.styleSignature.mood,
      anchor.styleSignature.cameraLanguage,
      ...anchor.styleSignature.colorPalette,
    ].map(s => s.toLowerCase());

    let totalMatches = 0;
    let totalPossible = scripts.length * styleKeywords.length;

    scripts.forEach((script) => {
      const sceneText = [
        script.visualDescription,
        script.keyframePrompt,
        script.videoPrompt,
      ].join(' ').toLowerCase();

      styleKeywords.forEach((keyword) => {
        if (sceneText.includes(keyword)) {
          totalMatches++;
        }
      });
    });

    return totalMatches / totalPossible;
  }

  /**
   * Check consistency between scenes
   */
  private checkSceneToSceneConsistency(scripts: SceneScript[]): number {
    if (scripts.length < 2) return 1.0;

    // Extract style descriptors from each scene
    const sceneDescriptors = scripts.map(script =>
      this.extractStyleDescriptors(script)
    );

    // Compare each pair of consecutive scenes
    let totalSimilarity = 0;
    for (let i = 0; i < sceneDescriptors.length - 1; i++) {
      const similarity = this.calculateSimilarity(
        sceneDescriptors[i],
        sceneDescriptors[i + 1]
      );
      totalSimilarity += similarity;
    }

    return totalSimilarity / (sceneDescriptors.length - 1);
  }

  /**
   * Extract style descriptors from scene
   */
  private extractStyleDescriptors(script: SceneScript): Set<string> {
    const text = [
      script.visualDescription,
      script.keyframePrompt,
      script.videoPrompt,
    ].join(' ').toLowerCase();

    // Extract key style words
    const styleWords = new Set<string>();
    const keywords = [
      'animation', '3d', '2d', 'cute', 'colorful', 'warm', 'bright',
      'smooth', 'gentle', 'magical', 'friendly', 'soft', 'vibrant',
      'pixar', 'ghibli', 'disney', 'cartoon',
    ];

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        styleWords.add(keyword);
      }
    });

    return styleWords;
  }

  /**
   * Calculate similarity between two descriptor sets (Jaccard similarity)
   */
  private calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Check color palette drift from Anchor
   */
  private checkColorPaletteDrift(scripts: SceneScript[], styleSignature: StyleSignature): number {
    // Extract color references from scene prompts
    const anchorColors = styleSignature.colorPalette.map(c => c.toLowerCase());

    let colorMentions = 0;
    let anchorColorMentions = 0;

    scripts.forEach((script) => {
      const text = [
        script.visualDescription,
        script.keyframePrompt,
        script.videoPrompt,
      ].join(' ').toLowerCase();

      // Count color keywords
      const colorKeywords = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black'];
      colorKeywords.forEach(color => {
        if (text.includes(color)) {
          colorMentions++;
          // Check if it matches anchor palette colors
          if (anchorColors.some(ac => ac.includes(color))) {
            anchorColorMentions++;
          }
        }
      });
    });

    if (colorMentions === 0) return 0; // No color mentions, assume no drift

    // Drift = proportion of non-anchor colors
    return 1 - (anchorColorMentions / colorMentions);
  }

  /**
   * Check if style signature matches across all scenes
   */
  private checkStyleSignatureMatch(scripts: SceneScript[], styleSignature: StyleSignature): boolean {
    const requiredStyle = styleSignature.visualStyle.toLowerCase();

    // Check that all scenes mention the required visual style
    const allMatch = scripts.every((script) => {
      const text = [
        script.visualDescription,
        script.keyframePrompt,
        script.videoPrompt,
      ].join(' ').toLowerCase();

      // Check for key style indicators
      const styleIndicators = requiredStyle.split(' ');
      return styleIndicators.some(indicator => text.includes(indicator));
    });

    return allMatch;
  }

  /**
   * Compute consistency signature hash for caching
   */
  static computeConsistencySignature(scripts: SceneScript[]): string {
    const signatureData = scripts.map(s => ({
      visual: s.visualDescription,
      keyframe: s.keyframePrompt,
    }));

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');
  }
}
