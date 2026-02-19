/**
 * Video Scoring Agent (QC Agent 4)
 * Aggregates all QC scores and makes pass/fail decision
 */

import {
  VideoScoreResult,
  TypographyQCResult,
  ConsistencyQCResult,
  SafetyQCResult,
  QCStatus,
} from '../shared/types';
import thresholds from './thresholds.json';

export class VideoScorer {
  /**
   * Score video based on all QC results
   */
  score(
    typography: TypographyQCResult,
    consistency: ConsistencyQCResult,
    safety: SafetyQCResult,
    videoMetadata?: VideoMetadata
  ): VideoScoreResult {
    // Component scores
    const componentScores = {
      typography: typography.score,
      consistency: consistency.score,
      safety: safety.score,
      technical: videoMetadata ? this.scoreTechnical(videoMetadata) : 1.0,
    };

    // Calculate weighted overall score
    const weights = thresholds.overall.weights;
    const overallScore =
      componentScores.typography * weights.typography +
      componentScores.consistency * weights.consistency +
      componentScores.safety * weights.safety +
      componentScores.technical * weights.technical;

    // Check if passed threshold
    const passedThreshold = overallScore >= thresholds.overall.minScore;

    // Determine status
    let status: QCStatus = 'PASS';
    if (!passedThreshold) {
      status = 'FAIL';
    }
    // Safety must always pass
    if (safety.status === 'FAIL') {
      status = 'FAIL';
    }
    // Typography must pass
    if (typography.status === 'FAIL') {
      status = 'FAIL';
    }
    // Consistency must pass
    if (consistency.status === 'FAIL') {
      status = 'FAIL';
    }

    return {
      status,
      overallScore,
      componentScores,
      passedThreshold,
    };
  }

  /**
   * Score technical quality (placeholder - would use actual video analysis in production)
   */
  private scoreTechnical(metadata: VideoMetadata): number {
    let score = 1.0;

    // Check resolution
    if (
      metadata.width < thresholds.technical.minResolution.width ||
      metadata.height < thresholds.technical.minResolution.height
    ) {
      score -= 0.3;
    }

    // Check duration
    if (
      metadata.duration < thresholds.technical.minDuration ||
      metadata.duration > thresholds.technical.maxDuration
    ) {
      score -= 0.2;
    }

    // Check FPS
    if (metadata.fps && metadata.fps < thresholds.technical.requiredFPS) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  /**
   * Determine if retry is needed based on scores
   */
  static shouldRetry(
    typography: TypographyQCResult,
    consistency: ConsistencyQCResult,
    safety: SafetyQCResult,
    currentRetryCount: number
  ): boolean {
    if (currentRetryCount >= thresholds.retry.maxAttemptsPerScene) {
      return false; // Max retries reached
    }

    const retryThresholds = thresholds.retry.retryOnScores;

    // Retry if any score is below threshold
    if (typography.score < retryThresholds.typography) {
      return true;
    }
    if (consistency.score < retryThresholds.consistency) {
      return true;
    }
    if (safety.score < retryThresholds.safety) {
      return true;
    }

    return false;
  }

  /**
   * Get retry reason for logging
   */
  static getRetryReason(
    typography: TypographyQCResult,
    consistency: ConsistencyQCResult,
    safety: SafetyQCResult
  ): string {
    const reasons: string[] = [];

    if (safety.status === 'FAIL') {
      reasons.push(`Safety (${safety.score.toFixed(2)}): ${safety.forbiddenWordsFound.join(', ')}`);
    }
    if (typography.status === 'FAIL') {
      reasons.push(`Typography (${typography.score.toFixed(2)}): ${typography.violations.join('; ')}`);
    }
    if (consistency.status === 'FAIL') {
      reasons.push(`Consistency (${consistency.score.toFixed(2)}): ${consistency.violations.join('; ')}`);
    }

    return reasons.join(' | ');
  }
}

interface VideoMetadata {
  width: number;
  height: number;
  duration: number; // seconds
  fps?: number;
  codec?: string;
  audioCodec?: string;
}
