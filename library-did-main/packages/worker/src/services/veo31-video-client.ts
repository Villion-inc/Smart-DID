/**
 * Veo 3.1 Video Client
 *
 * 키프레임 이미지 → 4초 무음 영상 생성.
 * 과학영상생성 시스템의 Veo 3.1 로직을 TypeScript로 포팅.
 *
 * Google GenAI SDK의 generate_videos API 사용.
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { logger } from '../config/logger';

export interface Veo31VideoRequest {
  prompt: string;
  imageBuffer: Buffer;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface Veo31VideoResult {
  success: boolean;
  videoBuffer?: Buffer;
  error?: string;
}

export class Veo31VideoClient {
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({ apiKey: apiKey || config.geminiApiKey });
  }

  /**
   * 키프레임 이미지 + 프롬프트 → Veo 3.1 무음 영상 생성
   */
  async generateVideo(request: Veo31VideoRequest): Promise<Veo31VideoResult> {
    try {
      logger.info('[Veo3.1] Generating silent video from keyframe...');

      const image = {
        imageBytes: request.imageBuffer.toString('base64'),
        mimeType: 'image/png',
      };

      const operation = await (this.client as any).models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: request.prompt,
        image,
        config: {
          aspectRatio: request.aspectRatio || '16:9',
          numberOfVideos: 1,
        },
      });

      // Poll until complete
      let op = operation;
      let waitCount = 0;
      const MAX_WAIT = 60; // 10분 (10초 × 60)

      while (!op.done && waitCount < MAX_WAIT) {
        waitCount++;
        if (waitCount % 6 === 0) {
          logger.info(`[Veo3.1] ... ${waitCount * 10}s elapsed`);
        }
        await new Promise((r) => setTimeout(r, 10000));
        op = await (this.client as any).operations.get(op);
      }

      if (!op.done) {
        return { success: false, error: 'Veo 3.1 generation timed out' };
      }

      if (op.result && op.result.generatedVideos && op.result.generatedVideos.length > 0) {
        const video = op.result.generatedVideos[0];
        const videoBytes = await (this.client as any).files.download({ file: video.video });

        let videoBuffer: Buffer;
        if (videoBytes instanceof Buffer) {
          videoBuffer = videoBytes;
        } else if (videoBytes instanceof Uint8Array) {
          videoBuffer = Buffer.from(videoBytes);
        } else {
          videoBuffer = Buffer.from(videoBytes);
        }

        logger.info('[Veo3.1] Video generation complete');
        return { success: true, videoBuffer };
      }

      return { success: false, error: 'No video in Veo 3.1 response' };
    } catch (error: any) {
      logger.error(`[Veo3.1] Generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
