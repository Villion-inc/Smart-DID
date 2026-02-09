/**
 * Scene Generator with Parallel/Sequential Fallback
 * Attempts parallel generation, auto-falls back to sequential on rate limits
 */

import {
  Anchor,
  SceneResult,
  SceneNumber,
  SceneType,
  GeminiProvider,
  GenerationMode,
  SceneScript,
} from '../shared/types';
import { RetryPolicy } from './retryPolicy';

export class SceneGenerator {
  private provider: GeminiProvider;
  private retryPolicy: RetryPolicy;

  constructor(provider: GeminiProvider) {
    this.provider = provider;
    this.retryPolicy = new RetryPolicy();
  }

  /**
   * Generate all scenes - attempts parallel first, falls back to sequential
   */
  async generateScenes(
    anchor: Anchor,
    forceSequential: boolean = false
  ): Promise<{ scenes: SceneResult[]; mode: GenerationMode }> {
    console.log('[Scene Generator] Starting scene generation');
    console.log(`[Scene Generator] Mode: ${forceSequential ? 'sequential (forced)' : 'parallel (attempt)'}`);

    const scenes = RetryPolicy.initializeScenes();

    // Try parallel unless forced sequential
    if (!forceSequential) {
      try {
        const parallelScenes = await this.generateParallel(anchor, scenes);
        console.log('[Scene Generator] ✅ Parallel generation succeeded');
        return { scenes: parallelScenes, mode: 'parallel' };
      } catch (error: any) {
        if (this.isRateLimitError(error)) {
          console.log('[Scene Generator] ⚠️  Rate limit detected, falling back to sequential');
          // Fall through to sequential
        } else {
          console.error('[Scene Generator] ❌ Parallel generation failed:', error.message);
          throw error;
        }
      }
    }

    // Sequential mode
    const sequentialScenes = await this.generateSequential(anchor, scenes);
    console.log('[Scene Generator] ✅ Sequential generation completed');
    return { scenes: sequentialScenes, mode: 'sequential' };
  }

  /**
   * Generate scenes in parallel
   */
  private async generateParallel(anchor: Anchor, scenes: SceneResult[]): Promise<SceneResult[]> {
    console.log('[Scene Generator] Attempting parallel generation...');

    const scenePromises = scenes.map(scene =>
      this.generateSingleScene(anchor, scene)
    );

    const results = await Promise.allSettled(scenePromises);

    // Check for rate limit errors
    const rateLimitError = results.find(
      r => r.status === 'rejected' && this.isRateLimitError(r.reason)
    );

    if (rateLimitError) {
      throw rateLimitError.status === 'rejected' ? rateLimitError.reason : new Error('Rate limit');
    }

    // Process results
    const updatedScenes = scenes.map((scene, index) => {
      const result = results[index];

      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[Scene Generator] Scene ${scene.sceneNumber} failed:`, result.reason?.message);
        return RetryPolicy.markSceneFailed(scene, result.reason?.message || 'Generation failed');
      }
    });

    return updatedScenes;
  }

  /**
   * Generate scenes sequentially
   */
  private async generateSequential(anchor: Anchor, scenes: SceneResult[]): Promise<SceneResult[]> {
    console.log('[Scene Generator] Using sequential generation');

    const updatedScenes: SceneResult[] = [];

    for (const scene of scenes) {
      try {
        console.log(`[Scene Generator] Generating scene ${scene.sceneNumber}...`);
        const result = await this.generateSingleScene(anchor, scene);
        updatedScenes.push(result);
        console.log(`[Scene Generator] ✅ Scene ${scene.sceneNumber} completed`);
      } catch (error: any) {
        console.error(`[Scene Generator] ❌ Scene ${scene.sceneNumber} failed:`, error.message);
        updatedScenes.push(RetryPolicy.markSceneFailed(scene, error.message));
      }

      // Small delay between scenes to avoid rate limits
      await this.delay(2000);
    }

    return updatedScenes;
  }

  /**
   * Generate a single scene
   */
  private async generateSingleScene(anchor: Anchor, scene: SceneResult): Promise<SceneResult> {
    const sceneType = scene.sceneType;

    try {
      // 1. Generate scene script
      console.log(`[Scene Generator] Scene ${scene.sceneNumber}: Generating script...`);
      const script = await this.provider.generateSceneScript(anchor, sceneType);

      // 2. Generate keyframe image
      console.log(`[Scene Generator] Scene ${scene.sceneNumber}: Generating keyframe...`);
      const keyframeBuffer = await this.provider.generateKeyframe(script.keyframePrompt);

      // 3. Generate video from keyframe
      console.log(`[Scene Generator] Scene ${scene.sceneNumber}: Generating video...`);
      const videoBuffer = await this.provider.generateVideo(
        keyframeBuffer,
        script.videoPrompt,
        8
      );

      // Save to temp storage (in production, upload to S3)
      const videoUrl = `temp://scene-${scene.sceneNumber}-${Date.now()}.mp4`;

      console.log(`[Scene Generator] Scene ${scene.sceneNumber}: ✅ Success`);

      return RetryPolicy.markSceneSuccess(scene, videoUrl, videoBuffer, script);
    } catch (error: any) {
      console.error(`[Scene Generator] Scene ${scene.sceneNumber}: ❌ Error:`, error.message);
      throw error;
    }
  }

  /**
   * Retry failed scenes only
   */
  async retryFailedScenes(
    anchor: Anchor,
    scenes: SceneResult[],
    forceSequential: boolean
  ): Promise<SceneResult[]> {
    const needRetry = this.retryPolicy.getScenesNeedingRetry(scenes);

    if (needRetry.length === 0) {
      console.log('[Scene Generator] No scenes need retry');
      return scenes;
    }

    console.log(`[Scene Generator] Retrying scenes: [${needRetry.join(', ')}]`);

    // Always use sequential for retries
    const updatedScenes = [...scenes];

    for (const sceneNumber of needRetry) {
      const sceneIndex = scenes.findIndex(s => s.sceneNumber === sceneNumber);
      const scene = scenes[sceneIndex];

      try {
        console.log(`[Scene Generator] Retrying scene ${sceneNumber} (attempt ${scene.retryCount + 1})...`);

        // Increment retry count
        const sceneWithRetry = this.retryPolicy.incrementRetryCount(scene);

        // Generate scene
        const result = await this.generateSingleScene(anchor, sceneWithRetry);

        updatedScenes[sceneIndex] = result;
        console.log(`[Scene Generator] ✅ Scene ${sceneNumber} retry succeeded`);
      } catch (error: any) {
        console.error(`[Scene Generator] ❌ Scene ${sceneNumber} retry failed:`, error.message);
        updatedScenes[sceneIndex] = RetryPolicy.markSceneFailed(
          this.retryPolicy.incrementRetryCount(scene),
          error.message
        );
      }

      // Delay between retries
      await this.delay(3000);
    }

    return updatedScenes;
  }

  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    const message = error.message?.toLowerCase() || '';
    const status = error.status || error.statusCode;

    return (
      status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded') ||
      message.includes('concurrency limit')
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scene type from scene number
   */
  private static getSceneType(sceneNumber: SceneNumber): SceneType {
    switch (sceneNumber) {
      case 1:
        return 'intro';
      case 2:
        return 'body';
      case 3:
        return 'outro';
    }
  }
}
