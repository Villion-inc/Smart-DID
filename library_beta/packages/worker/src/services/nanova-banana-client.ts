/**
 * 나노바나나 (Banana.dev) 이미지 생성 클라이언트
 * trailer-engine 그대로 사용 — Stable Diffusion, FLUX, 또는 커스텀 모델
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imagePath?: string;
  error?: string;
}

export class NanovaBananaClient {
  private apiKey: string;
  private modelKey: string;

  constructor(apiKey: string, modelKey: string) {
    this.apiKey = apiKey;
    this.modelKey = modelKey;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      console.log('[Banana] 🎨 이미지 생성 시작...');
      console.log(`   프롬프트: ${request.prompt.substring(0, 80)}...`);

      const response = await axios.post(
        'https://api.banana.dev/start/v4',
        {
          apiKey: this.apiKey,
          modelKey: this.modelKey,
          modelInputs: {
            prompt: request.prompt,
            negative_prompt:
              request.negativePrompt ||
              'ugly, blurry, low quality, distorted, deformed, bad anatomy',
            width: request.width || 1920,
            height: request.height || 1080,
            num_inference_steps: request.numInferenceSteps || 50,
            guidance_scale: request.guidanceScale || 7.5,
            ...(request.seed != null && { seed: request.seed }),
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000,
        }
      );

      const callId = response.data.callID;
      const imageUrl = await this.pollForResult(callId);

      console.log('[Banana] ✅ 이미지 생성 완료!');

      return { success: true, imageUrl };
    } catch (error: any) {
      console.error('[Banana] ❌ 에러:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async pollForResult(callId: string, maxAttempts: number = 60): Promise<string> {
    console.log('[Banana] ⏳ 이미지 생성 대기 중...');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await axios.post('https://api.banana.dev/check/v4', {
          apiKey: this.apiKey,
          callID: callId,
        });

        const status = response.data.status;

        if (status === 'success') {
          return response.data.modelOutputs[0].image_url;
        }
        if (status === 'error') {
          throw new Error(response.data.message || 'Generation failed');
        }

        await this.delay(2000);
        if (attempt % 5 === 0) {
          console.log(`[Banana] 대기 중... (${attempt * 2}초 경과)`);
        }
      } catch (e: any) {
        if (attempt === maxAttempts - 1) throw e;
        await this.delay(2000);
      }
    }

    throw new Error('이미지 생성 타임아웃');
  }

  /** imageUrl을 fetch하여 Buffer 반환 (GeminiProvider generateKeyframe용) */
  async fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  async downloadImage(imageUrl: string, outputPath: string): Promise<string> {
    console.log(`[Banana] 📥 이미지 다운로드 중: ${outputPath}`);
    const buf = await this.fetchImageAsBuffer(imageUrl);
    await fs.writeFile(outputPath, buf);
    console.log(`[Banana] ✅ 다운로드 완료: ${outputPath}`);
    return outputPath;
  }

  async generateConsistentImages(
    prompts: string[],
    baseSeed: number,
    outputDir: string
  ): Promise<string[]> {
    console.log('\n' + '='.repeat(60));
    console.log('[Banana] 🎨 일관성 있는 이미지 배치 생성');
    console.log(`   총 ${prompts.length}개 이미지`);
    console.log(`   Base Seed: ${baseSeed}`);
    console.log('='.repeat(60) + '\n');

    const imagePaths: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      console.log(`\n[${i + 1}/${prompts.length}] 이미지 생성 중...`);

      const result = await this.generateImage({
        prompt: prompts[i],
        seed: baseSeed + i,
        width: 1920,
        height: 1080,
        numInferenceSteps: 50,
        guidanceScale: 7.5,
      });

      if (result.success && result.imageUrl) {
        const imagePath = path.join(outputDir, `keyframe-${i + 1}.png`);
        await this.downloadImage(result.imageUrl, imagePath);
        imagePaths.push(imagePath);
      } else {
        throw new Error(`이미지 ${i + 1} 생성 실패: ${result.error}`);
      }

      if (i < prompts.length - 1) {
        console.log('[Banana] ⏳ 잠시 대기 중... (Rate Limit)');
        await this.delay(3000);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[Banana] ✅ 모든 이미지 생성 완료!');
    console.log('='.repeat(60) + '\n');

    return imagePaths;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 대체 옵션: Replicate를 통한 Stable Diffusion (trailer-engine 그대로)
 */
export class ReplicateImageClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    try {
      console.log('[Replicate] 🎨 이미지 생성 시작...');

      const response = await axios.post(
        'https://api.replicate.com/v1/predictions',
        {
          version: 'stability-ai/sdxl:latest',
          input: {
            prompt: request.prompt,
            negative_prompt: request.negativePrompt,
            width: request.width || 1920,
            height: request.height || 1080,
            num_inference_steps: request.numInferenceSteps || 50,
            guidance_scale: request.guidanceScale || 7.5,
            ...(request.seed != null && { seed: request.seed }),
          },
        },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const predictionId = response.data.id;
      let status = 'processing';
      let imageUrl: string | null = null;

      while (status === 'processing' || status === 'starting') {
        await this.delay(2000);
        const statusResponse = await axios.get(
          `https://api.replicate.com/v1/predictions/${predictionId}`,
          { headers: { Authorization: `Token ${this.apiKey}` } }
        );
        status = statusResponse.data.status;
        imageUrl = statusResponse.data.output?.[0];
      }

      if (status === 'succeeded' && imageUrl) {
        console.log('[Replicate] ✅ 이미지 생성 완료!');
        return { success: true, imageUrl };
      }
      throw new Error(`Generation failed with status: ${status}`);
    } catch (error: any) {
      console.error('[Replicate] ❌ 에러:', error.message);
      return { success: false, error: error.message };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
