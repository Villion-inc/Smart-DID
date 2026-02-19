import { VideoJobData, VideoScene, VIDEO_CONSTANTS } from '@smart-did/shared';
import { logger } from '../config/logger';
import { promptService } from './prompt.service';
import { veoService } from './veo.service';
import { storageService } from './storage.service';

export interface GenerationResult {
  success: boolean;
  videoUrl?: string;
  subtitleUrl?: string;
  error?: string;
}

/**
 * Service for orchestrating video generation
 */
export class VideoGeneratorService {
  /**
   * Generate complete video for a book
   */
  async generateVideo(jobData: VideoJobData): Promise<GenerationResult> {
    const { bookId, title, author, summary } = jobData;

    logger.info(`Starting video generation for book ${bookId}: ${title}`);

    try {
      // Step 1: Validate content safety
      if (!promptService.validateSafety(title, summary)) {
        throw new Error('Content failed safety check');
      }

      // Step 2: Generate prompts for all scenes
      const scenes = promptService.generateAllScenes(title, author, summary);

      // Step 3: Generate each scene with retries
      const sceneUrls: string[] = [];
      for (const scene of scenes) {
        const sceneUrl = await this.generateSceneWithRetry(scene);
        sceneUrls.push(sceneUrl);
      }

      // Step 4: Merge scenes into single video
      const mergedVideoUrl = await this.mergeScenes(bookId, sceneUrls);

      // Step 5: Generate and save subtitles
      const subtitleUrl = await this.generateSubtitles(bookId, scenes);

      logger.info(`Video generation completed for book ${bookId}`);

      return {
        success: true,
        videoUrl: mergedVideoUrl,
        subtitleUrl,
      };
    } catch (error) {
      logger.error(`Video generation failed for book ${bookId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a single scene with retry logic
   */
  private async generateSceneWithRetry(scene: VideoScene, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Generating scene ${scene.sceneNumber}, attempt ${attempt}/${maxRetries}`);
        const sceneUrl = await veoService.generateScene(scene);

        // Validate scene passed safety filter
        if (await this.validateScene(sceneUrl)) {
          return sceneUrl;
        } else {
          throw new Error('Scene failed safety validation');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        logger.warn(`Scene ${scene.sceneNumber} generation attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          await this.delay(2000 * attempt); // Exponential backoff
        }
      }
    }

    throw new Error(`Failed to generate scene ${scene.sceneNumber} after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Validate scene content (safety check)
   */
  private async validateScene(_sceneUrl: string): Promise<boolean> {
    // TODO: Implement actual safety validation
    // This could involve checking the generated video for inappropriate content
    return true;
  }

  /**
   * Merge multiple scene videos into one
   */
  private async mergeScenes(bookId: string, sceneUrls: string[]): Promise<string> {
    logger.info(`Merging ${sceneUrls.length} scenes for book ${bookId}`);

    // TODO: Implement actual video merging using ffmpeg or similar
    // For now, return a mock merged URL
    const mockMergedData = Buffer.from('mock-video-data');
    return storageService.saveVideo(bookId, mockMergedData);
  }

  /**
   * Generate subtitles file from scenes
   */
  private async generateSubtitles(bookId: string, scenes: VideoScene[]): Promise<string> {
    const subtitles = scenes.map((scene, index) => ({
      start: index * VIDEO_CONSTANTS.SCENE_DURATION,
      end: (index + 1) * VIDEO_CONSTANTS.SCENE_DURATION,
      text: scene.subtitleText,
    }));

    const vttContent = storageService.generateVTTContent(subtitles);
    return storageService.saveSubtitle(bookId, vttContent);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const videoGeneratorService = new VideoGeneratorService();
