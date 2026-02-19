import fs from 'fs';
import os from 'os';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import { VideoScene } from '@smart-did/shared';
import { config } from '../config';
import { logger } from '../config/logger';
import { SoraClient } from './sora-client';

/**
 * Video Generation Service
 * Sora API (OpenAI) 또는 Veo3.1 (Google) 사용
 */
export class VeoService {
  private client: AxiosInstance;
  private soraClient: SoraClient | null = null;
  private useProvider: 'sora' | 'veo' | 'mock' = 'mock';

  constructor() {
    this.client = axios.create({
      baseURL: config.veo.apiEndpoint,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.veo.apiKey}`,
      },
      timeout: 300000, // 5 minutes
    });

    // Sora API 키가 있으면 Sora 사용
    if (config.openaiApiKey) {
      this.soraClient = new SoraClient(config.openaiApiKey);
      this.useProvider = 'sora';
      logger.info('[VideoService] Using Sora (OpenAI) for video generation');
    } else if (config.veo.apiKey) {
      this.useProvider = 'veo';
      logger.info('[VideoService] Using Veo3.1 (Google) for video generation');
    } else {
      this.useProvider = 'mock';
      logger.warn('[VideoService] No API key found, using mock generation');
    }
  }

  /**
   * Generate a single scene
   */
  async generateScene(scene: VideoScene): Promise<string> {
    logger.info(`Generating scene ${scene.sceneNumber} with ${this.useProvider}`);

    try {
      let videoUrl: string;

      switch (this.useProvider) {
        case 'sora':
          videoUrl = await this.generateWithSora(scene);
          break;
        case 'veo':
          videoUrl = await this.generateWithVeo(scene);
          break;
        default:
          videoUrl = await this.mockGeneration(scene);
      }

      logger.info(`Scene ${scene.sceneNumber} generated successfully`);
      return videoUrl;
    } catch (error) {
      logger.error(`Failed to generate scene ${scene.sceneNumber}:`, error);
      throw new Error(`Video generation failed: ${error}`);
    }
  }

  /**
   * Sora API로 영상 생성
   * Sora는 URL 대신 buffer만 반환할 수 있음 → 임시 파일로 저장 후 file URL 반환
   */
  private async generateWithSora(scene: VideoScene): Promise<string> {
    if (!this.soraClient) {
      throw new Error('Sora client not initialized');
    }

    const result = await this.soraClient.generateVideo({
      prompt: this.buildChildFriendlyPrompt(scene),
      duration: scene.duration || 8,
      aspectRatio: '16:9',
      resolution: '720p',
    });

    if (!result.success) {
      throw new Error(result.error || 'Sora generation failed');
    }

    if (result.videoUrl) return result.videoUrl;
    if (result.videoBuffer) {
      const tmpDir = os.tmpdir();
      const filename = `sora-scene-${scene.sceneNumber}-${Date.now()}.mp4`;
      const filePath = path.join(tmpDir, filename);
      fs.writeFileSync(filePath, result.videoBuffer);
      return `file://${filePath}`;
    }
    throw new Error('Sora returned no video URL or buffer');
  }

  /**
   * Veo3.1 API로 영상 생성
   */
  private async generateWithVeo(scene: VideoScene): Promise<string> {
    const response = await this.client.post('/generate', {
      prompt: this.buildChildFriendlyPrompt(scene),
      duration: scene.duration || 8,
      subtitles: scene.subtitleText,
      safetyFilter: 'strict',
      childFriendly: true,
    });

    return response.data.videoUrl;
  }

  /**
   * 아동 친화적 프롬프트 생성
   */
  private buildChildFriendlyPrompt(scene: VideoScene): string {
    return `
Children's book illustration style, safe for all ages, bright and colorful.
${scene.prompt}
Style: Soft, friendly animation suitable for children. No violence, no scary elements.
Mood: Warm, educational, engaging for young readers.
    `.trim();
  }

  /**
   * Mock 영상 생성 (개발/테스트용)
   */
  private async mockGeneration(scene: VideoScene): Promise<string> {
    logger.warn(`[Mock] Generating mock video for scene ${scene.sceneNumber}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return `/videos/mock-scene-${scene.sceneNumber}-${Date.now()}.mp4`;
  }

  /**
   * Check generation status (for async generation)
   */
  async checkStatus(jobId: string): Promise<{ status: string; videoUrl?: string }> {
    logger.info(`Checking status for job ${jobId}`);
    const response = await this.client.get(`/jobs/${jobId}`);
    return response.data;
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    if (this.useProvider === 'sora') {
      return !!config.openaiApiKey;
    }
    if (this.useProvider === 'veo') {
      return !!config.veo.apiKey;
    }
    return true; // mock은 항상 true
  }
}

export const veoService = new VeoService();
