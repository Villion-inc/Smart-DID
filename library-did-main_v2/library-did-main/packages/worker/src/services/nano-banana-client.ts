/**
 * Nano Banana Pro Client (Gemini 3 Pro Image)
 *
 * 캐릭터 레퍼런스 이미지 주입으로 일관성 유지하며 씬 키프레임 이미지 생성.
 * 과학영상생성 시스템의 generate_nano.py 로직을 TypeScript로 포팅.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { config } from '../config';
import { logger } from '../config/logger';

const MODEL = 'gemini-3-pro-image-preview';

export interface KeyframeRequest {
  prompt: string;
  referenceImages?: Buffer[];
}

export interface KeyframeResult {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
}

export class NanoBananaClient {
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({ apiKey: apiKey || config.geminiApiKey });
  }

  /**
   * 나노바나나프로로 키프레임 이미지 생성.
   * referenceImages가 있으면 멀티이미지 입력으로 캐릭터/스타일 일관성 유지.
   */
  async generateKeyframe(request: KeyframeRequest): Promise<KeyframeResult> {
    try {
      const contents: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

      // 레퍼런스 이미지가 있으면 먼저 입력
      if (request.referenceImages && request.referenceImages.length > 0) {
        for (const refBuf of request.referenceImages) {
          contents.push({
            inlineData: {
              mimeType: 'image/png',
              data: refBuf.toString('base64'),
            },
          });
        }
      }

      contents.push({ text: request.prompt });

      const response = await this.client.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: contents }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      // 응답에서 이미지 파트 추출
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            return { success: true, imageBuffer };
          }
        }
      }

      return { success: false, error: 'No image in response' };
    } catch (error: any) {
      logger.error(`[NanoBanana] Generation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
