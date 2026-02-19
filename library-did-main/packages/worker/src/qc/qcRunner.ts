/**
 * QC Pipeline Runner
 * Orchestrates all QC validators in sequence: Safety → Typography → Consistency → Scoring
 */

import { QCReport, SceneScript, Anchor, TypographyPlan } from '../shared/types';
import { SafetyGate } from './safetyGate';
import { TypographyValidator } from './checkTypography';
import { ConsistencyChecker } from './checkConsistency';
import { VideoScorer } from './scoreVideo';

export class QCRunner {
  private safetyGate: SafetyGate;
  private typographyValidator: TypographyValidator;
  private consistencyChecker: ConsistencyChecker;
  private videoScorer: VideoScorer;

  constructor() {
    this.safetyGate = new SafetyGate();
    this.typographyValidator = new TypographyValidator();
    this.consistencyChecker = new ConsistencyChecker();
    this.videoScorer = new VideoScorer();
  }

  /**
   * Run complete QC pipeline
   * Returns QC report with pass/fail decision
   */
  async runQC(
    jobId: string,
    scripts: SceneScript[],
    anchor: Anchor,
    language: 'ko' | 'en'
  ): Promise<QCReport> {
    console.log(`[QC Runner] Starting QC pipeline for job ${jobId}`);

    // 1. Safety Gate (MUST PASS FIRST)
    console.log('[QC Runner] Stage 1: Safety Gate');
    const safety = this.safetyGate.validate(scripts, anchor.safetyConstraints);
    console.log(`[QC Runner] Safety: ${safety.status} (score: ${safety.score})`);

    if (safety.status === 'FAIL') {
      console.log('[QC Runner] ❌ Safety gate FAILED - blocking pipeline');
      return this.buildReport(jobId, safety, null, null, null);
    }

    // 2. Typography Validation
    console.log('[QC Runner] Stage 2: Typography Validation');
    const typography = await this.typographyValidator.validate(
      scripts,
      anchor.typographyPlan,
      language
    );
    console.log(`[QC Runner] Typography: ${typography.status} (score: ${typography.score})`);

    // 3. Consistency Check (against Anchor)
    console.log('[QC Runner] Stage 3: Consistency Check');
    const consistency = this.consistencyChecker.validate(scripts, anchor);
    console.log(`[QC Runner] Consistency: ${consistency.status} (score: ${consistency.score})`);
    console.log(`[QC Runner]   - Anchor match: ${consistency.anchorMatch.toFixed(2)}`);
    console.log(`[QC Runner]   - Scene consistency: ${consistency.sceneToSceneConsistency.toFixed(2)}`);
    console.log(`[QC Runner]   - Color drift: ${consistency.colorPaletteDrift.toFixed(2)}`);

    // 4. Video Scoring (aggregate all scores)
    console.log('[QC Runner] Stage 4: Video Scoring');
    const scoring = this.videoScorer.score(typography, consistency, safety);
    console.log(`[QC Runner] Overall: ${scoring.status} (score: ${scoring.overallScore.toFixed(2)})`);

    // Build final report
    const report = this.buildReport(jobId, safety, typography, consistency, scoring);

    console.log(`[QC Runner] ✅ QC pipeline complete: ${report.overall}`);
    return report;
  }

  /**
   * Build QC report
   */
  private buildReport(
    jobId: string,
    safety: any,
    typography: any,
    consistency: any,
    scoring: any
  ): QCReport {
    // If safety failed, only return safety results
    if (safety.status === 'FAIL' && !typography) {
      return {
        jobId,
        overall: 'FAIL',
        overallScore: 0,
        typography: this.getEmptyTypographyResult(),
        consistency: this.getEmptyConsistencyResult(),
        safety,
        scoring: this.getEmptyScoringResult(),
        timestamp: new Date().toISOString(),
      };
    }

    // Full report
    return {
      jobId,
      overall: scoring.status,
      overallScore: scoring.overallScore,
      typography,
      consistency,
      safety,
      scoring,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if retry is needed
   */
  shouldRetry(report: QCReport, currentRetryCount: number): boolean {
    return VideoScorer.shouldRetry(
      report.typography,
      report.consistency,
      report.safety,
      currentRetryCount
    );
  }

  /**
   * Get retry reason for logging
   */
  getRetryReason(report: QCReport): string {
    return VideoScorer.getRetryReason(
      report.typography,
      report.consistency,
      report.safety
    );
  }

  private getEmptyTypographyResult() {
    return {
      status: 'FAIL' as const,
      score: 0,
      checks: {
        subtitleLength: false,
        subtitlePosition: false,
        fontSizeCompliance: false,
        contrastRatio: false,
      },
      violations: ['Not evaluated due to safety failure'],
    };
  }

  private getEmptyConsistencyResult() {
    return {
      status: 'FAIL' as const,
      score: 0,
      anchorMatch: 0,
      sceneToSceneConsistency: 0,
      colorPaletteDrift: 1,
      styleSignatureMatch: false,
      violations: ['Not evaluated due to safety failure'],
    };
  }

  private getEmptyScoringResult() {
    return {
      status: 'FAIL' as const,
      overallScore: 0,
      componentScores: {
        typography: 0,
        consistency: 0,
        safety: 0,
        technical: 0,
      },
      passedThreshold: false,
    };
  }
}
