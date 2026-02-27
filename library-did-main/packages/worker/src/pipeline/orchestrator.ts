/**
 * Pipeline Orchestrator
 * Coordinates the complete video generation workflow
 */

import path from 'path';
import fs from 'fs/promises';
import {
  VideoGenerationJob,
  VideoGenerationResult,
  VideoGenerationRequest,
  VideoGenerationJobV2,
  SceneResultV2,
  SceneResult,
  BookFacts,
  StyleBible,
  ScenePlan,
  SceneScriptV2,
  SceneNumber,
  GeminiProvider,
} from '../shared/types';
import { config } from '../config';
import { VideoAssembler } from './assemble';
import { AnchorBuilder } from '../anchor/buildAnchor';
import { SceneGenerator } from '../retry/sceneGenerator';
import { RetryPolicy } from '../retry/retryPolicy';
import { QCRunner } from '../qc/qcRunner';
import { CostReporter } from '../cost/costReport';
import { VTTGenerator } from '../subtitles/vttGenerator';
import { cacheStore } from '../cache/cacheStore';
import { getStorageProvider } from '../services/storage-provider.factory';

// V2 imports
import { groundBook } from './grounding';
import { buildStyleBible, applyStyleToPrompt } from './style/styleBible';
import { planScenes, generateSceneScripts } from './planning';
import {
  createRetryState,
  recordStageSuccess,
  recordStageFailure,
  isJobComplete,
  isJobFailed,
  getScenesNeedingWork,
  getRetryStateSummary,
} from '../retry/hierarchicalRetry';

export class PipelineOrchestrator {
  private provider: GeminiProvider;
  private anchorBuilder: AnchorBuilder;
  private sceneGenerator: SceneGenerator;
  private retryPolicy: RetryPolicy;
  private qcRunner: QCRunner;
  private costReporter: CostReporter;
  private vttGenerator: VTTGenerator;

  constructor(provider: GeminiProvider) {
    this.provider = provider;
    this.anchorBuilder = new AnchorBuilder(provider);
    this.sceneGenerator = new SceneGenerator(provider);
    this.retryPolicy = new RetryPolicy();
    this.qcRunner = new QCRunner();
    this.costReporter = new CostReporter();
    this.vttGenerator = new VTTGenerator();
  }

  /**
   * Execute complete pipeline
   */
  async execute(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[Pipeline] Starting job ${jobId}`);
    console.log(`[Pipeline] Title: ${request.title}`);
    console.log(`[Pipeline] Language: ${request.language}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Check cache
      console.log('[Pipeline] Step 0: Cache Check');
      const cacheHit = await cacheStore.has(request.title, request.author);
      if (cacheHit) {
        console.log('[Pipeline] ✅ Cache HIT - returning cached result');
        const cached = await cacheStore.get(request.title, request.author);
        return cached!;
      }
      console.log('[Pipeline] Cache MISS - proceeding with generation\n');

      // Step 1: Generate Anchor (Style Bible)
      console.log('[Pipeline] Step 1: Generate Anchor (Style Bible)');
      const anchor = await this.anchorBuilder.buildAnchor(
        jobId,
        request.title,
        request.language
      );
      console.log('[Pipeline] ✅ Anchor generated');
      console.log(`[Pipeline]   - Visual Style: ${anchor.styleSignature.visualStyle}`);
      console.log(`[Pipeline]   - Color Palette: ${anchor.styleSignature.colorPalette.slice(0, 3).join(', ')}`);
      console.log(`[Pipeline]   - Consistency Hash: ${anchor.styleSignature.consistencyHash.substring(0, 8)}...\n`);

      // Step 2: Generate Scenes (with retry logic)
      console.log('[Pipeline] Step 2: Generate Scenes');
      let job: VideoGenerationJob = {
        jobId,
        request,
        status: 'processing',
        mode: 'parallel',
        forceSequential: false,
        anchor,
        scenes: RetryPolicy.initializeScenes(),
        retryCount: 0,
        cacheHit: false,
        createdAt: new Date().toISOString(),
      };

      // Initial generation attempt
      const { scenes: generatedScenes, mode } = await this.sceneGenerator.generateScenes(
        anchor,
        job.forceSequential
      );
      job.scenes = generatedScenes;
      job.mode = mode;

      // Retry loop for failed scenes
      while (this.retryPolicy.needsRetry(job.scenes) && job.retryCount < 3) {
        job.retryCount++;
        console.log(`\n[Pipeline] Retry Round ${job.retryCount}`);
        console.log(`[Pipeline] ${this.retryPolicy.getRetrySummary(job.scenes)}\n`);

        // Retry failed scenes (always sequential)
        job.scenes = await this.sceneGenerator.retryFailedScenes(
          anchor,
          job.scenes,
          true // force sequential for retries
        );
      }

      // Check if all scenes succeeded
      if (!this.retryPolicy.isSuccess(job.scenes)) {
        const failureReason = this.retryPolicy.getFailureReason(job.scenes);
        console.error('[Pipeline] ❌ Scene generation failed:', failureReason);

        return {
          jobId,
          status: 'failed',
          error: failureReason,
          cacheHit: false,
          mode: job.mode,
          createdAt: job.createdAt,
          completedAt: new Date().toISOString(),
        };
      }

      console.log('[Pipeline] ✅ All scenes generated successfully\n');

      // Step 3: QC Validation
      console.log('[Pipeline] Step 3: QC Validation');
      const scripts = job.scenes.map(s => s.script!);
      const qcReport = await this.qcRunner.runQC(jobId, scripts, anchor, request.language);

      if (qcReport.overall === 'FAIL') {
        console.error('[Pipeline] ❌ QC validation failed');
        console.error(`[Pipeline] Reason: ${this.qcRunner.getRetryReason(qcReport)}`);

        return {
          jobId,
          status: 'failed',
          error: `QC validation failed: ${this.qcRunner.getRetryReason(qcReport)}`,
          qcReport,
          cacheHit: false,
          mode: job.mode,
          createdAt: job.createdAt,
          completedAt: new Date().toISOString(),
        };
      }

      console.log('[Pipeline] ✅ QC validation passed\n');

      // Step 4: Generate Subtitles
      console.log('[Pipeline] Step 4: Generate Subtitles');
      const vttContent = this.vttGenerator.generateVTT(
        scripts,
        anchor.typographyPlan,
        request.language
      );
      const subtitleUrl = `output/subtitles/${jobId}.vtt`;
      console.log('[Pipeline] ✅ Subtitles generated\n');

      // Step 5: Assemble Video (placeholder - would use FFmpeg)
      console.log('[Pipeline] Step 5: Assemble Video');
      const videoUrl = `output/videos/${jobId}.mp4`;
      console.log('[Pipeline] ⚠️  Assembly skipped (FFmpeg integration needed)');
      console.log('[Pipeline] Scene videos available separately\n');

      // Step 6: Cost Reporting
      console.log('[Pipeline] Step 6: Cost Reporting');
      const elapsedTimeMs = Date.now() - startTime;
      const costReport = this.costReporter.generateReport(
        jobId,
        job.scenes,
        0.01, // Anchor cost
        elapsedTimeMs,
        false
      );
      console.log('[Pipeline] ✅ Cost report generated');
      console.log(`[Pipeline] Total cost: $${costReport.breakdown.total.toFixed(2)}`);
      console.log(`[Pipeline] Elapsed time: ${(elapsedTimeMs / 1000).toFixed(1)}s\n`);

      // Build result
      const result: VideoGenerationResult = {
        jobId,
        status: 'completed',
        videoUrl,
        subtitleUrl,
        qcReport,
        costReport,
        cacheHit: false,
        mode: job.mode,
        createdAt: job.createdAt,
        completedAt: new Date().toISOString(),
      };

      // Store in cache
      await cacheStore.set(request.title, result, request.author);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`[Pipeline] ✅ Job ${jobId} COMPLETED`);
      console.log(`[Pipeline] Mode: ${job.mode}`);
      console.log(`[Pipeline] QC Score: ${qcReport.overallScore.toFixed(2)}`);
      console.log(`[Pipeline] Cost: $${costReport.breakdown.total.toFixed(2)}`);
      console.log(`[Pipeline] Time: ${(elapsedTimeMs / 1000).toFixed(1)}s`);
      console.log(`${'='.repeat(60)}\n`);

      return result;
    } catch (error: any) {
      const elapsedTimeMs = Date.now() - startTime;
      console.error(`\n[Pipeline] ❌ Job ${jobId} FAILED`);
      console.error(`[Pipeline] Error: ${error.message}`);
      console.error(`[Pipeline] Elapsed time: ${(elapsedTimeMs / 1000).toFixed(1)}s\n`);

      return {
        jobId,
        status: 'failed',
        error: error.message,
        cacheHit: false,
        mode: 'parallel',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    }
  }
}

/**
 * V2 Pipeline Orchestrator
 * New pipeline with Book Grounding, Style Bible, and Hierarchical Retry
 */
export class PipelineOrchestratorV2 {
  private provider: GeminiProvider;
  private qcRunner: QCRunner;
  private costReporter: CostReporter;
  private vttGenerator: VTTGenerator;

  constructor(provider: GeminiProvider) {
    this.provider = provider;
    this.qcRunner = new QCRunner();
    this.costReporter = new CostReporter();
    this.vttGenerator = new VTTGenerator();
  }

  /**
   * Execute complete V2 pipeline
   */
  async execute(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const startTime = Date.now();
    const jobId = `job_v2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[Pipeline V2] Starting job ${jobId}`);
    console.log(`[Pipeline V2] Title: ${request.title}`);
    console.log(`[Pipeline V2] Author: ${request.author || 'Not specified'}`);
    console.log(`[Pipeline V2] Language: ${request.language}`);
    console.log(`${'═'.repeat(60)}\n`);

    try {
      // Step 0: Book Grounding
      console.log('[Pipeline V2] Step 0: Book Grounding');
      const groundingResult = await groundBook(request.title, request.author);

      if (!groundingResult) {
        console.error('[Pipeline V2] ❌ Book grounding failed - book not found');
        return {
          jobId,
          status: 'failed',
          error: `Book not found: "${request.title}"`,
          cacheHit: false,
          mode: 'sequential',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
      }

      const { bookFacts, candidate } = groundingResult;
      console.log(`[Pipeline V2] ✅ Book grounded: "${bookFacts.canonicalTitle}" by ${bookFacts.author}`);
      console.log(`[Pipeline V2]   Confidence: ${(bookFacts.sourceConfidence * 100).toFixed(0)}%\n`);

      // Step 1: Build Style Bible
      console.log('[Pipeline V2] Step 1: Build Style Bible');
      const styleBible = await buildStyleBible(bookFacts);
      console.log('[Pipeline V2] ✅ Style bible created\n');

      // Step 2: Plan Scenes
      console.log('[Pipeline V2] Step 2: Plan Scenes');
      const scenePlans = await planScenes(bookFacts, styleBible);
      console.log('[Pipeline V2] ✅ Scene plans created\n');

      // Step 3: Generate Scene Scripts
      console.log('[Pipeline V2] Step 3: Generate Scene Scripts');
      const scripts = await generateSceneScripts(bookFacts, styleBible, scenePlans);
      console.log('[Pipeline V2] ✅ Scene scripts generated\n');

      // Step 4: Initialize job with retry state
      console.log('[Pipeline V2] Step 4: Initialize Generation with Hierarchical Retry');
      let retryState = createRetryState(jobId, {
        script: 3,
        keyframe: 3,
        video: 2,
      });

      // Store scripts in retry state
      scripts.forEach((script, index) => {
        retryState = recordStageSuccess(retryState, script.sceneNumber, 'script', { script });
      });

      // Initialize scene results
      const scenesV2: SceneResultV2[] = scripts.map((script) => ({
        sceneNumber: script.sceneNumber,
        sceneType: script.sceneType,
        sceneRole: script.sceneRole,
        status: 'pending' as const,
        script,
        retryState: retryState.scenes[script.sceneNumber - 1],
      }));

      // Step 5: Generate Keyframes and Videos with Hierarchical Retry
      console.log('[Pipeline V2] Step 5: Generate Keyframes and Videos');

      // Generate keyframes
      for (let i = 0; i < scenesV2.length; i++) {
        const scene = scenesV2[i];
        if (!scene.script) continue;

        console.log(`[Pipeline V2] Scene ${scene.sceneNumber}: Generating keyframe...`);

        let keyframeSuccess = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!keyframeSuccess && attempts < maxAttempts) {
          try {
            attempts++;
            const keyframeBuffer = await this.provider.generateKeyframe(scene.script.keyframePrompt);
            scene.keyframeBuffer = keyframeBuffer;
            scene.keyframeUrl = `temp://keyframe-${scene.sceneNumber}-${Date.now()}.png`;
            retryState = recordStageSuccess(retryState, scene.sceneNumber, 'keyframe', {
              keyframeBuffer,
              keyframeUrl: scene.keyframeUrl,
            });
            keyframeSuccess = true;
            console.log(`[Pipeline V2] Scene ${scene.sceneNumber}: ✅ Keyframe generated`);
          } catch (error: any) {
            console.error(`[Pipeline V2] Scene ${scene.sceneNumber}: Keyframe attempt ${attempts} failed: ${error.message}`);
            const result = recordStageFailure(retryState, scene.sceneNumber, 'keyframe', error.message);
            retryState = result.state;

            if (!result.result.shouldContinue) {
              break;
            }

            await this.delay(2000 * attempts);
          }
        }
      }

      // Generate videos
      for (let i = 0; i < scenesV2.length; i++) {
        const scene = scenesV2[i];
        if (!scene.script || !scene.keyframeBuffer) {
          scene.status = 'failed';
          continue;
        }

        console.log(`[Pipeline V2] Scene ${scene.sceneNumber}: Generating video...`);

        let videoSuccess = false;
        let attempts = 0;
        const maxAttempts = 2;

        while (!videoSuccess && attempts < maxAttempts) {
          try {
            attempts++;
            const videoBuffer = await this.provider.generateVideo(
              scene.keyframeBuffer,
              scene.script.videoPrompt,
              8
            );
            scene.videoBuffer = videoBuffer;
            scene.videoUrl = `temp://video-${scene.sceneNumber}-${Date.now()}.mp4`;
            scene.status = 'success';
            scene.generatedAt = new Date().toISOString();
            videoSuccess = true;
            console.log(`[Pipeline V2] Scene ${scene.sceneNumber}: ✅ Video generated`);
          } catch (error: any) {
            console.error(`[Pipeline V2] Scene ${scene.sceneNumber}: Video attempt ${attempts} failed: ${error.message}`);
            const result = recordStageFailure(retryState, scene.sceneNumber, 'video', error.message);
            retryState = result.state;

            if (!result.result.shouldContinue) {
              scene.status = 'failed';
              break;
            }

            await this.delay(3000 * attempts);
          }
        }
      }

      // Check results
      const successfulScenes = scenesV2.filter((s) => s.status === 'success');
      const failedScenes = scenesV2.filter((s) => s.status === 'failed');

      console.log(`\n[Pipeline V2] Generation Summary:`);
      console.log(`[Pipeline V2] ${getRetryStateSummary(retryState)}`);
      console.log(`[Pipeline V2] Successful: ${successfulScenes.length}/3`);
      console.log(`[Pipeline V2] Failed: ${failedScenes.length}/3\n`);

      if (failedScenes.length === 3) {
        return {
          jobId,
          status: 'failed',
          error: 'All scenes failed to generate',
          cacheHit: false,
          mode: 'sequential',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };
      }

      // Step 6: Generate Subtitles
      console.log('[Pipeline V2] Step 6: Generate Subtitles');
      const subtitles = this.generateSubtitles(scripts, request.language);
      let subtitleUrl = `output/subtitles/${jobId}.vtt`;
      console.log('[Pipeline V2] ✅ Subtitles generated\n');

      // Step 7: Merge scenes (FFmpeg) and save to storage
      console.log('[Pipeline V2] Step 7: Save Video');
      let videoUrl = `output/videos/${jobId}.mp4`;
      const bookId = (request as VideoGenerationRequest & { bookId?: string }).bookId;
      const sortedScenes = [...successfulScenes].sort(
        (a, b) => a.sceneNumber - b.sceneNumber
      );
      const tempDir = path.join(config.tempDir, jobId);
      const tempFiles: string[] = [];

      if (bookId && sortedScenes.length > 0 && sortedScenes.every((s) => s.videoBuffer)) {
        try {
          await fs.mkdir(tempDir, { recursive: true });

          // Write each scene buffer to temp file (order: 1, 2, 3)
          const scenePaths: string[] = [];
          for (let i = 0; i < sortedScenes.length; i++) {
            const scene = sortedScenes[i];
            const filePath = path.join(tempDir, `scene-${scene.sceneNumber}.mp4`);
            await fs.writeFile(filePath, scene.videoBuffer!);
            tempFiles.push(filePath);
            scenePaths.push(filePath);
          }

          // VTT to temp file
          const vttPath = path.join(tempDir, `${jobId}.vtt`);
          await fs.writeFile(vttPath, subtitles, 'utf-8');
          tempFiles.push(vttPath);

          // SceneResult[] for assembler (videoUrl = file path)
          const scenesForAssemble: SceneResult[] = sortedScenes.map((s, i) => ({
            sceneNumber: s.sceneNumber,
            sceneType: s.sceneType,
            status: 'success' as const,
            videoUrl: scenePaths[i],
            retryCount: 0,
          }));

          const mergedPath = path.join(tempDir, 'merged.mp4');
          const assembler = new VideoAssembler();
          const finalPath = await assembler.concatAndSubtitles(
            scenesForAssemble,
            vttPath,
            mergedPath
          );

          const mergedBuffer = await fs.readFile(finalPath);
          const storage = getStorageProvider();
          const timestamp = Date.now();
          const videoKey = `${bookId}-${timestamp}.mp4`;
          const savedVideoUrl = await storage.save(videoKey, mergedBuffer);
          videoUrl = savedVideoUrl.startsWith('/videos/') ? '/api' + savedVideoUrl : savedVideoUrl;

          // VTT 자막도 Storage에 저장
          const vttBuffer = Buffer.from(subtitles, 'utf-8');
          const vttKey = `${bookId}-${timestamp}.vtt`;
          const savedVttUrl = await storage.save(vttKey, vttBuffer);
          subtitleUrl = savedVttUrl.startsWith('/videos/') ? '/api' + savedVttUrl : savedVttUrl;

          console.log(`[Pipeline V2] ✅ Video saved (${sortedScenes.length} scenes merged): ${videoUrl}`);
          console.log(`[Pipeline V2] ✅ Subtitles saved: ${subtitleUrl}\n`);

          // Cleanup temp files
          for (const f of tempFiles) {
            try {
              await fs.unlink(f);
            } catch {
              /* ignore */
            }
          }
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        } catch (err: any) {
          console.error('[Pipeline V2] ⚠️  Merge/save failed:', err?.message || err);
          
          // Fallback 1: Try to save concat-only video (without subtitles)
          const concatPath = path.join(tempDir, 'merged_concat.mp4');
          try {
            const concatExists = await fs.access(concatPath).then(() => true).catch(() => false);
            if (concatExists && bookId) {
              const storage = getStorageProvider();
              const timestamp = Date.now();
              const concatBuffer = await fs.readFile(concatPath);
              const key = `${bookId}-${timestamp}.mp4`;
              const savedUrl = await storage.save(key, concatBuffer);
              videoUrl = savedUrl.startsWith('/videos/') ? '/api' + savedUrl : savedUrl;

              // VTT 저장 (외부 자막 파일로 사용)
              const vttBuffer = Buffer.from(subtitles, 'utf-8');
              const vttKey = `${bookId}-${timestamp}.vtt`;
              const savedVttUrl = await storage.save(vttKey, vttBuffer);
              subtitleUrl = savedVttUrl.startsWith('/videos/') ? '/api' + savedVttUrl : savedVttUrl;

              console.log(`[Pipeline V2] ✅ Fallback: concat video saved (no burned subtitles): ${videoUrl}`);
              console.log(`[Pipeline V2] ✅ Fallback: subtitles saved (external): ${subtitleUrl}\n`);
            } else {
              throw new Error('Concat file not found');
            }
          } catch {
            // Fallback 2: save first scene only
            const first = sortedScenes[0];
            if (first?.videoBuffer && bookId) {
              try {
                const storage = getStorageProvider();
                const timestamp = Date.now();
                const key = `${bookId}-${timestamp}.mp4`;
                const savedUrl = await storage.save(key, first.videoBuffer);
                videoUrl = savedUrl.startsWith('/videos/') ? '/api' + savedUrl : savedUrl;

                // Fallback에서도 VTT 저장
                const vttBuffer = Buffer.from(subtitles, 'utf-8');
                const vttKey = `${bookId}-${timestamp}.vtt`;
                const savedVttUrl = await storage.save(vttKey, vttBuffer);
                subtitleUrl = savedVttUrl.startsWith('/videos/') ? '/api' + savedVttUrl : savedVttUrl;

                console.log(`[Pipeline V2] ✅ Fallback: first scene saved: ${videoUrl}`);
                console.log(`[Pipeline V2] ✅ Fallback: subtitles saved: ${subtitleUrl}\n`);
              } catch (e: any) {
                console.error('[Pipeline V2] ⚠️  Fallback save failed:', e?.message || e);
              }
            }
          }
          // Cleanup on error
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        }
      } else {
        console.log('[Pipeline V2] ⚠️  No bookId or video buffer; using placeholder URL\n');
      }

      // Step 8: Cost Reporting
      const elapsedTimeMs = Date.now() - startTime;
      console.log('[Pipeline V2] Step 8: Cost Reporting');
      const costReport = this.costReporter.generateReport(
        jobId,
        scenesV2.map((s) => ({
          sceneNumber: s.sceneNumber,
          sceneType: s.sceneType,
          status: s.status,
          retryCount: s.retryState.scriptRetries + s.retryState.keyframeRetries + s.retryState.videoRetries,
          videoUrl: s.videoUrl,
          script: s.script as any,
        })),
        0.02, // Book grounding + style bible cost
        elapsedTimeMs,
        false
      );
      console.log(`[Pipeline V2] Total estimated cost: $${costReport.breakdown.total.toFixed(2)}`);
      console.log(`[Pipeline V2] Elapsed time: ${(elapsedTimeMs / 1000).toFixed(1)}s\n`);

      // Build result
      const result: VideoGenerationResult = {
        jobId,
        status: successfulScenes.length === 3 ? 'completed' : 'completed',
        videoUrl,
        subtitleUrl,
        costReport,
        cacheHit: false,
        mode: 'sequential',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`[Pipeline V2] ✅ Job ${jobId} COMPLETED`);
      console.log(`[Pipeline V2] Book: "${bookFacts.canonicalTitle}" by ${bookFacts.author}`);
      console.log(`[Pipeline V2] Scenes: ${successfulScenes.length}/3 successful`);
      console.log(`[Pipeline V2] Cost: $${costReport.breakdown.total.toFixed(2)}`);
      console.log(`[Pipeline V2] Time: ${(elapsedTimeMs / 1000).toFixed(1)}s`);
      console.log(`${'═'.repeat(60)}\n`);

      return result;
    } catch (error: any) {
      const elapsedTimeMs = Date.now() - startTime;
      console.error(`\n[Pipeline V2] ❌ Job ${jobId} FAILED`);
      console.error(`[Pipeline V2] Error: ${error.message}`);
      console.error(`[Pipeline V2] Elapsed time: ${(elapsedTimeMs / 1000).toFixed(1)}s\n`);

      return {
        jobId,
        status: 'failed',
        error: error.message,
        cacheHit: false,
        mode: 'sequential',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate VTT subtitles from V2 scripts
   */
  private generateSubtitles(scripts: SceneScriptV2[], language: 'ko' | 'en'): string {
    let vttContent = 'WEBVTT\n\n';

    scripts.forEach((script, index) => {
      const startTime = index * 8;
      const endTime = startTime + 8;

      vttContent += `${index + 1}\n`;
      vttContent += `${this.formatVttTime(startTime)} --> ${this.formatVttTime(endTime)}\n`;
      vttContent += `${script.narration}\n\n`;
    });

    return vttContent;
  }

  /**
   * Format seconds to VTT time format (HH:MM:SS.mmm)
   */
  private formatVttTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.000`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Save book facts and style bible to output directory
   */
  async saveIntermediateArtifacts(
    outputDir: string,
    bookFacts: BookFacts,
    styleBible: StyleBible,
    scenePlans: ScenePlan[],
    scripts: SceneScriptV2[]
  ): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    await fs.mkdir(outputDir, { recursive: true });

    // Save book facts
    await fs.writeFile(
      path.join(outputDir, 'bookFacts.json'),
      JSON.stringify(bookFacts, null, 2),
      'utf-8'
    );

    // Save style bible
    await fs.writeFile(
      path.join(outputDir, 'styleBible.json'),
      JSON.stringify(styleBible, null, 2),
      'utf-8'
    );

    // Save scene plans
    await fs.writeFile(
      path.join(outputDir, 'scenePlans.json'),
      JSON.stringify(scenePlans, null, 2),
      'utf-8'
    );

    // Save scripts
    await fs.writeFile(
      path.join(outputDir, 'scripts.json'),
      JSON.stringify(scripts, null, 2),
      'utf-8'
    );

    console.log(`[Pipeline V2] Artifacts saved to: ${outputDir}`);
  }
}
