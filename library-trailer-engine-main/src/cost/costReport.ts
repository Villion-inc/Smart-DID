/**
 * Cost Reporter (QC Agent 5)
 * Tracks API costs per scene with retry breakdown
 */

import { CostReport, SceneResult } from '../shared/types';

export class CostReporter {
  // Current Gemini API pricing (approximate)
  private static readonly PRICING = {
    geminiFlash: 0.01, // per script generation
    imagen4: 0.05, // per keyframe image
    veo31: 0.90, // per 8-second video
  };

  /**
   * Generate cost report for completed job
   */
  generateReport(
    jobId: string,
    scenes: SceneResult[],
    anchorCost: number,
    elapsedTimeMs: number,
    cacheHit: boolean
  ): CostReport {
    // If cache hit, costs are zero
    if (cacheHit) {
      return {
        jobId,
        breakdown: {
          anchorGeneration: 0,
          scriptGeneration: 0,
          keyframeGeneration: 0,
          videoGeneration: 0,
          retries: 0,
          total: 0,
        },
        apiCalls: {
          gemini: 0,
          imagen: 0,
          veo: 0,
        },
        retryBreakdown: {
          scene1: 0,
          scene2: 0,
          scene3: 0,
        },
        elapsedTimeMs,
        cacheHit: true,
        timestamp: new Date().toISOString(),
      };
    }

    // Calculate costs
    const scriptCost = this.calculateScriptCost(scenes);
    const keyframeCost = this.calculateKeyframeCost(scenes);
    const videoCost = this.calculateVideoCost(scenes);
    const retryCost = this.calculateRetryCost(scenes);

    const totalCost = anchorCost + scriptCost + keyframeCost + videoCost + retryCost;

    // Count API calls
    const apiCalls = this.countAPICalls(scenes);

    // Get retry breakdown
    const retryBreakdown = this.getRetryBreakdown(scenes);

    return {
      jobId,
      breakdown: {
        anchorGeneration: anchorCost,
        scriptGeneration: scriptCost,
        keyframeGeneration: keyframeCost,
        videoGeneration: videoCost,
        retries: retryCost,
        total: totalCost,
      },
      apiCalls,
      retryBreakdown,
      elapsedTimeMs,
      cacheHit: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Estimate cost before generation
   */
  estimateCost(): CostReport['breakdown'] {
    return {
      anchorGeneration: CostReporter.PRICING.geminiFlash,
      scriptGeneration: CostReporter.PRICING.geminiFlash * 3, // 3 scenes
      keyframeGeneration: CostReporter.PRICING.imagen4 * 3, // 3 keyframes
      videoGeneration: CostReporter.PRICING.veo31 * 3, // 3 videos
      retries: 0, // Unknown until generation
      total: CostReporter.PRICING.geminiFlash * 4 + // anchor + 3 scripts
             CostReporter.PRICING.imagen4 * 3 +
             CostReporter.PRICING.veo31 * 3,
    };
  }

  /**
   * Calculate script generation cost
   */
  private calculateScriptCost(scenes: SceneResult[]): number {
    // Count successful scenes (each needed a script)
    const successfulScenes = scenes.filter(s => s.status === 'success').length;
    return successfulScenes * CostReporter.PRICING.geminiFlash;
  }

  /**
   * Calculate keyframe generation cost
   */
  private calculateKeyframeCost(scenes: SceneResult[]): number {
    const successfulScenes = scenes.filter(s => s.status === 'success').length;
    return successfulScenes * CostReporter.PRICING.imagen4;
  }

  /**
   * Calculate video generation cost
   */
  private calculateVideoCost(scenes: SceneResult[]): number {
    const successfulScenes = scenes.filter(s => s.status === 'success').length;
    return successfulScenes * CostReporter.PRICING.veo31;
  }

  /**
   * Calculate retry cost
   */
  private calculateRetryCost(scenes: SceneResult[]): number {
    const totalRetries = scenes.reduce((sum, scene) => sum + scene.retryCount, 0);

    // Each retry costs: script + keyframe + video
    const costPerAttempt =
      CostReporter.PRICING.geminiFlash +
      CostReporter.PRICING.imagen4 +
      CostReporter.PRICING.veo31;

    return totalRetries * costPerAttempt;
  }

  /**
   * Count API calls
   */
  private countAPICalls(scenes: SceneResult[]): { gemini: number; imagen: number; veo: number } {
    const successful = scenes.filter(s => s.status === 'success').length;
    const totalAttempts = scenes.reduce((sum, scene) => {
      // Current attempt + retries
      return sum + (scene.status === 'success' ? scene.retryCount + 1 : scene.retryCount);
    }, 0);

    return {
      gemini: totalAttempts, // 1 per attempt (script generation)
      imagen: totalAttempts, // 1 per attempt (keyframe)
      veo: totalAttempts, // 1 per attempt (video)
    };
  }

  /**
   * Get retry breakdown per scene
   */
  private getRetryBreakdown(scenes: SceneResult[]): {
    scene1: number;
    scene2: number;
    scene3: number;
  } {
    return {
      scene1: scenes.find(s => s.sceneNumber === 1)?.retryCount || 0,
      scene2: scenes.find(s => s.sceneNumber === 2)?.retryCount || 0,
      scene3: scenes.find(s => s.sceneNumber === 3)?.retryCount || 0,
    };
  }

  /**
   * Format cost report for display
   */
  formatReport(report: CostReport): string {
    return [
      `Cost Report for Job ${report.jobId}`,
      `${'='.repeat(50)}`,
      `Cache Hit: ${report.cacheHit ? 'YES (no cost)' : 'NO'}`,
      ``,
      `Breakdown:`,
      `  Anchor Generation:    $${report.breakdown.anchorGeneration.toFixed(2)}`,
      `  Script Generation:    $${report.breakdown.scriptGeneration.toFixed(2)}`,
      `  Keyframe Generation:  $${report.breakdown.keyframeGeneration.toFixed(2)}`,
      `  Video Generation:     $${report.breakdown.videoGeneration.toFixed(2)}`,
      `  Retries:              $${report.breakdown.retries.toFixed(2)}`,
      `  ${'─'.repeat(30)}`,
      `  Total:                $${report.breakdown.total.toFixed(2)}`,
      ``,
      `API Calls:`,
      `  Gemini:  ${report.apiCalls.gemini}`,
      `  Imagen:  ${report.apiCalls.imagen}`,
      `  Veo:     ${report.apiCalls.veo}`,
      ``,
      `Retries per Scene:`,
      `  Scene 1: ${report.retryBreakdown.scene1}`,
      `  Scene 2: ${report.retryBreakdown.scene2}`,
      `  Scene 3: ${report.retryBreakdown.scene3}`,
      ``,
      `Elapsed Time: ${(report.elapsedTimeMs / 1000).toFixed(1)}s`,
      `Timestamp: ${report.timestamp}`,
    ].join('\n');
  }
}
