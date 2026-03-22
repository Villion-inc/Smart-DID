/**
 * Scene-Level Retry Policy
 * Only retries failed scenes, reuses successful ones
 */

import { SceneResult, SceneNumber, QCReport } from '../shared/types';
import thresholds from '../qc/thresholds.json';

export class RetryPolicy {
  private maxRetries: number;

  constructor(maxRetries: number = thresholds.retry.maxAttemptsPerScene) {
    this.maxRetries = maxRetries;
  }

  /**
   * Determine which scenes need retry
   */
  getScenesNeedingRetry(scenes: SceneResult[]): SceneNumber[] {
    return scenes
      .filter(scene => {
        return (
          scene.status === 'failed' &&
          scene.retryCount < this.maxRetries
        );
      })
      .map(scene => scene.sceneNumber);
  }

  /**
   * Check if any scenes need retry
   */
  needsRetry(scenes: SceneResult[]): boolean {
    return this.getScenesNeedingRetry(scenes).length > 0;
  }

  /**
   * Check if scene has exhausted retries
   */
  hasExhaustedRetries(scene: SceneResult): boolean {
    return scene.retryCount >= this.maxRetries;
  }

  /**
   * Get successful scenes (to reuse)
   */
  getSuccessfulScenes(scenes: SceneResult[]): SceneResult[] {
    return scenes.filter(scene => scene.status === 'success');
  }

  /**
   * Increment retry count for a scene
   */
  incrementRetryCount(scene: SceneResult): SceneResult {
    return {
      ...scene,
      retryCount: scene.retryCount + 1,
    };
  }

  /**
   * Build retry summary for logging
   */
  getRetrySummary(scenes: SceneResult[]): string {
    const needRetry = this.getScenesNeedingRetry(scenes);
    const successful = this.getSuccessfulScenes(scenes);
    const exhausted = scenes.filter(s => this.hasExhaustedRetries(s) && s.status === 'failed');

    return [
      `Successful: [${successful.map(s => s.sceneNumber).join(', ')}]`,
      `Need Retry: [${needRetry.join(', ')}]`,
      `Exhausted: [${exhausted.map(s => s.sceneNumber).join(', ')}]`,
    ].join(' | ');
  }

  /**
   * Calculate total retry cost multiplier
   */
  getRetryCostMultiplier(scenes: SceneResult[]): number {
    const totalRetries = scenes.reduce((sum, scene) => sum + scene.retryCount, 0);
    return 1 + (totalRetries * 0.33); // Each retry adds ~33% to cost
  }

  /**
   * Get retry breakdown for cost reporting
   */
  getRetryBreakdown(scenes: SceneResult[]): { scene1: number; scene2: number; scene3: number } {
    const breakdown = { scene1: 0, scene2: 0, scene3: 0 };

    scenes.forEach(scene => {
      const key = `scene${scene.sceneNumber}` as keyof typeof breakdown;
      breakdown[key] = scene.retryCount;
    });

    return breakdown;
  }

  /**
   * Check if all scenes are in final state (success or exhausted retries)
   */
  isComplete(scenes: SceneResult[]): boolean {
    return scenes.every(scene =>
      scene.status === 'success' ||
      (scene.status === 'failed' && this.hasExhaustedRetries(scene))
    );
  }

  /**
   * Determine if job succeeded (all scenes successful)
   */
  isSuccess(scenes: SceneResult[]): boolean {
    return scenes.every(scene => scene.status === 'success');
  }

  /**
   * Get failure reason if job failed
   */
  getFailureReason(scenes: SceneResult[]): string {
    const failed = scenes.filter(s => s.status === 'failed');

    if (failed.length === 0) {
      return '';
    }

    return failed
      .map(s => `Scene ${s.sceneNumber}: ${s.error || 'Unknown error'} (${s.retryCount} retries)`)
      .join('; ');
  }

  /**
   * Create initial scene results
   */
  static initializeScenes(): SceneResult[] {
    return [
      {
        sceneNumber: 1,
        sceneType: 'intro',
        status: 'pending',
        retryCount: 0,
      },
      {
        sceneNumber: 2,
        sceneType: 'body',
        status: 'pending',
        retryCount: 0,
      },
      {
        sceneNumber: 3,
        sceneType: 'outro',
        status: 'pending',
        retryCount: 0,
      },
    ];
  }

  /**
   * Mark scene as failed with error
   */
  static markSceneFailed(scene: SceneResult, error: string): SceneResult {
    return {
      ...scene,
      status: 'failed',
      error,
    };
  }

  /**
   * Mark scene as successful
   */
  static markSceneSuccess(
    scene: SceneResult,
    videoUrl: string,
    videoBuffer: Buffer,
    script: any
  ): SceneResult {
    return {
      ...scene,
      status: 'success',
      videoUrl,
      videoBuffer,
      script,
      generatedAt: new Date().toISOString(),
    };
  }
}
