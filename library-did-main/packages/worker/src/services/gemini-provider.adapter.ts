/**
 * GeminiProvider 구현 — PipelineOrchestratorV2에서 사용
 * trailer-engine src/services 기준: 키프레임 = Banana(NanovaBananaClient), 비디오 = Veo31
 *
 * - generateKeyframe: BANANA_API_KEY 설정 시 NanovaBananaClient 사용, 미설정 시 플레이스홀더 PNG
 * - generateVideo: Veo31 generateVideoFromImageBuffer 사용 (VEO_API_KEY 필요)
 * - generateAnchor / generateSceneScript: V2는 groundBook/planScenes 사용 → 미사용 시 스텁
 */

import type { GeminiProvider, Anchor, SceneScript, SceneType } from '../shared/types';
import { config } from '../config';
import { Veo31Client } from './veo31-client';
import { NanovaBananaClient } from './nanova-banana-client';
import { logger } from '../config/logger';

/** 1x1 PNG placeholder (Banana/Veo 미설정 시) */
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export class GeminiProviderAdapter implements GeminiProvider {
  private veo: Veo31Client | null = null;
  private banana: NanovaBananaClient | null = null;

  constructor() {
    if (config.veo?.apiKey) {
      this.veo = new Veo31Client(
        config.veo.apiKey,
        process.env.VEO_PROJECT_ID || 'your-project-id',
        process.env.VEO_LOCATION || 'us-central1'
      );
    }
    if (config.banana?.apiKey && config.banana?.modelKey) {
      this.banana = new NanovaBananaClient(config.banana.apiKey, config.banana.modelKey);
    }
  }

  /** V2 파이프라인에서는 groundBook + buildStyleBible + planScenes 사용 → 호출되지 않음 */
  async generateAnchor(_title: string, _language: string): Promise<Anchor> {
    throw new Error('V2 pipeline uses groundBook/buildStyleBible, not generateAnchor');
  }

  /** V2 파이프라인에서는 generateSceneScripts(planning) 사용 → 호출되지 않음 */
  async generateSceneScript(_anchor: Anchor, _sceneType: SceneType): Promise<SceneScript> {
    throw new Error('V2 pipeline uses generateSceneScripts(planning), not generateSceneScript');
  }

  /**
   * 키프레임 이미지 생성
   * - BANANA_API_KEY + BANANA_MODEL_KEY 설정 시: trailer-engine과 동일하게 NanovaBananaClient 사용
   * - 미설정 시: 플레이스홀더 PNG (로컬 E2E용)
   */
  async generateKeyframe(prompt: string): Promise<Buffer> {
    if (this.banana) {
      const result = await this.banana.generateImage({
        prompt,
        width: 1920,
        height: 1080,
        numInferenceSteps: 50,
        guidanceScale: 7.5,
      });
      if (result.success && result.imageUrl) {
        return this.banana.fetchImageAsBuffer(result.imageUrl);
      }
      throw new Error(result.error ?? 'Banana keyframe generation failed');
    }
    logger.debug(`[GeminiProvider] generateKeyframe (placeholder): ${prompt.slice(0, 60)}...`);
    return Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');
  }

  /**
   * 키프레임 + 프롬프트로 비디오 생성
   * - Veo 설정 시: imageBuffer를 base64로 Veo에 전달 후 반환 URL을 fetch하여 Buffer 반환
   * - 미설정 시: 안내 메시지와 함께 에러
   */
  async generateVideo(
    keyframeBuffer: Buffer,
    prompt: string,
    duration: 8
  ): Promise<Buffer> {
    if (!this.veo) {
      throw new Error(
        'Veo not configured. Set VEO_API_KEY (and optionally VEO_PROJECT_ID, VEO_LOCATION) for Pipeline V2 video generation.'
      );
    }
    const result = await this.veo.generateVideoFromImageBuffer(
      keyframeBuffer,
      prompt,
      duration
    );
    if (!result.success || !result.videoBuffer) {
      throw new Error(result.error || 'Veo video generation failed');
    }
    return result.videoBuffer;
  }
}
