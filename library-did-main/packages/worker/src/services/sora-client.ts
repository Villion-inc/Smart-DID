/**
 * Sora API 클라이언트 (OpenAI)
 * 텍스트/이미지 → 영상 생성
 * @see https://platform.openai.com/docs/api-reference/videos
 */

import axios from 'axios';
import { logger } from '../config/logger';

/** OpenAI Sora 공식: POST /v1/videos, GET /v1/videos/{id}, GET /v1/videos/{id}/content */

interface SoraVideoRequest {
  prompt: string;
  imageUrl?: string;
  imageBytesBase64?: string;
  duration?: number; // seconds → seconds "4"|"8"|"12"
  aspectRatio?: '16:9' | '9:16' | '1:1';
  resolution?: '480p' | '720p' | '1080p';
}

interface SoraVideoResult {
  success: boolean;
  videoUrl?: string;
  videoBuffer?: Buffer;
  error?: string;
}

/** size: 720x1280(세로), 1280x720(가로), 1024x1792, 1792x1024 */
const SIZE_MAP: Record<string, string> = {
  '16:9': '1280x720',
  '9:16': '720x1280',
  '1:1': '1024x1024',
};

export class SoraClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * 텍스트 프롬프트로 영상 생성 (OpenAI Sora: create → poll → content)
   */
  async generateVideo(request: SoraVideoRequest): Promise<SoraVideoResult> {
    try {
      logger.info('[Sora] 🎬 영상 생성 시작...');
      logger.info(`   프롬프트: ${request.prompt.substring(0, 80)}...`);

      const duration = request.duration ?? 8;
      const seconds = String(Math.min(12, Math.max(4, duration)) as 4 | 8 | 12);
      const size = SIZE_MAP[request.aspectRatio || '16:9'] || '1280x720';

      // 1) Create job: POST /v1/videos (공식 엔드포인트)
      const createRes = await axios.post(
        `${this.baseUrl}/videos`,
        {
          model: 'sora-2',
          prompt: request.prompt,
          seconds,
          size,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const jobId = createRes.data?.id;
      if (!jobId) {
        throw new Error(createRes.data?.error?.message || 'No job id in create response');
      }

      // 2) Poll until completed/failed
      const polled = await this.pollForResult(jobId);
      if (!polled.success) return polled;

      // 3) Download content (GET /v1/videos/{id}/content)
      const contentRes = await axios.get(`${this.baseUrl}/videos/${jobId}/content`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        responseType: 'arraybuffer',
        timeout: 120000,
      });
      const videoBuffer = Buffer.from(contentRes.data as ArrayBuffer);

      logger.info('[Sora] ✅ 영상 생성 완료!');
      return { success: true, videoBuffer };
    } catch (error: any) {
      logger.error('[Sora] ❌ 에러:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 이미지 기반 영상 생성 (Image-to-Video)
   * 현재는 텍스트만 전송; input_reference 사용 시 multipart/form-data 별도 구현 가능
   */
  async generateVideoFromImage(
    imageBuffer: Buffer,
    prompt: string,
    duration: number = 8
  ): Promise<SoraVideoResult> {
    const result = await this.generateVideo({
      prompt,
      imageBytesBase64: imageBuffer.toString('base64'),
      duration,
      aspectRatio: '16:9',
    });

    if (!result.success) return result;
    if (result.videoBuffer) return result;

    if (result.videoUrl) {
      try {
        const res = await axios.get(result.videoUrl, {
          responseType: 'arraybuffer',
          timeout: 300000,
        });
        return { ...result, videoBuffer: Buffer.from(res.data) };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Failed to download video' };
      }
    }
    return result;
  }

  /**
   * 비동기 작업 결과 폴링 (GET /v1/videos/{id})
   */
  private async pollForResult(
    jobId: string,
    maxAttempts: number = 120
  ): Promise<SoraVideoResult> {
    logger.info('[Sora] ⏳ 영상 생성 대기 중...');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/videos/${jobId}`, {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 10000,
        });

        const status = response.data?.status;
        if (status === 'completed') {
          return { success: true };
        }
        if (status === 'failed') {
          const err = response.data?.error;
          return {
            success: false,
            error: (err?.message || err?.code) || 'Generation failed',
          };
        }

        if (attempt % 10 === 0) {
          const progress = response.data?.progress ?? 0;
          logger.info(`[Sora] 대기 중... (${attempt * 3}초, progress: ${progress}%)`);
        }

        await this.delay(3000);
      } catch (e: any) {
        logger.warn(`[Sora] 폴링 에러: ${e.message}`);
      }
    }

    return { success: false, error: '영상 생성 타임아웃' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
