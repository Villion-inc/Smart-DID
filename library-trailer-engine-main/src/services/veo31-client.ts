/**
 * Veo 3.1 API 클라이언트
 * Google의 최신 비디오 생성 모델
 * Image-to-Video 기능 지원
 */

import axios from 'axios';
import fs from 'fs/promises';

/**
 * Veo 비디오 생성 요청
 */
interface VeoVideoRequest {
  prompt: string;
  imageUrl?: string;        // 키 프레임 이미지 (Image-to-Video)
  duration: number;         // 초 단위 (8초)
  aspectRatio?: string;     // "16:9", "9:16" 등
  fps?: number;             // 기본 24
  motionIntensity?: number; // 0-10 (움직임 강도)
}

/**
 * Veo 비디오 생성 응답
 */
interface VeoVideoResult {
  success: boolean;
  videoUrl?: string;
  videoPath?: string;
  error?: string;
}

/**
 * Veo 3.1 API 클라이언트
 */
export class Veo31Client {
  private apiKey: string;
  private projectId: string;
  private location: string;

  constructor(
    apiKey: string,
    projectId: string = 'your-project-id',
    location: string = 'us-central1'
  ) {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.location = location;
  }

  /**
   * 이미지 기반 비디오 생성 (Image-to-Video)
   * 이것이 핵심 기능!
   */
  async generateVideoFromImage(request: VeoVideoRequest): Promise<VeoVideoResult> {
    try {
      console.log('[Veo 3.1] 🎬 비디오 생성 시작...');
      console.log(`   프롬프트: ${request.prompt.substring(0, 80)}...`);
      console.log(`   키 프레임: ${request.imageUrl}`);
      console.log(`   길이: ${request.duration}초`);

      // Vertex AI Veo 3.1 API 엔드포인트
      const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/veo-3.1:predict`;

      const payload = {
        instances: [
          {
            // Image-to-Video 모드
            image: request.imageUrl,
            prompt: request.prompt,
            parameters: {
              duration: request.duration,
              fps: request.fps || 24,
              aspectRatio: request.aspectRatio || '16:9',
              motionIntensity: request.motionIntensity || 5,
              // 일관성 유지를 위한 설정
              consistency: {
                characterConsistency: true,
                styleConsistency: true,
                colorConsistency: true,
              },
            },
          },
        ],
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 180000, // 3분
      });

      // Veo는 비동기 처리일 수 있음
      if (response.data.operationId) {
        const videoUrl = await this.pollForVideoResult(response.data.operationId);
        return {
          success: true,
          videoUrl,
        };
      } else {
        const videoUrl = response.data.predictions[0].videoUri;
        console.log('[Veo 3.1] ✅ 비디오 생성 완료!');
        return {
          success: true,
          videoUrl,
        };
      }
    } catch (error: any) {
      console.error('[Veo 3.1] ❌ 에러:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 비동기 작업 결과 폴링
   */
  private async pollForVideoResult(
    operationId: string,
    maxAttempts: number = 120
  ): Promise<string> {
    console.log('[Veo 3.1] ⏳ 비디오 생성 대기 중...');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await axios.get(
        `https://${this.location}-aiplatform.googleapis.com/v1/${operationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const done = response.data.done;

      if (done) {
        const videoUrl = response.data.response.videoUri;
        console.log('[Veo 3.1] ✅ 비디오 생성 완료!');
        return videoUrl;
      }

      // 진행 상황 출력
      if (attempt % 5 === 0) {
        console.log(`[Veo 3.1] 대기 중... (${attempt * 3}초 경과)`);
      }

      await this.delay(3000); // 3초 대기
    }

    throw new Error('비디오 생성 타임아웃');
  }

  /**
   * 3개 씬 일괄 생성
   */
  async generateAllSceneVideos(
    imageUrls: string[],
    prompts: string[],
    duration: number = 8
  ): Promise<string[]> {
    console.log('\n' + '='.repeat(60));
    console.log('[Veo 3.1] 🎬 3개 씬 비디오 일괄 생성');
    console.log('='.repeat(60) + '\n');

    const videoUrls: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      console.log(`\n[${i + 1}/${imageUrls.length}] Scene ${i + 1} 비디오 생성 중...`);

      const result = await this.generateVideoFromImage({
        imageUrl: imageUrls[i],
        prompt: prompts[i],
        duration,
        fps: 24,
        aspectRatio: '16:9',
        motionIntensity: 5,
      });

      if (result.success && result.videoUrl) {
        videoUrls.push(result.videoUrl);
        console.log(`[Veo 3.1] ✅ Scene ${i + 1} 완료!`);
      } else {
        throw new Error(`Scene ${i + 1} 비디오 생성 실패: ${result.error}`);
      }

      // Rate Limit 고려
      if (i < imageUrls.length - 1) {
        console.log('[Veo 3.1] ⏳ 잠시 대기 중...');
        await this.delay(5000); // 5초 대기
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[Veo 3.1] ✅ 모든 비디오 생성 완료!');
    console.log('='.repeat(60) + '\n');

    return videoUrls;
  }

  /**
   * 비디오 다운로드
   */
  async downloadVideo(videoUrl: string, outputPath: string): Promise<string> {
    console.log(`[Veo 3.1] 📥 비디오 다운로드 중: ${outputPath}`);

    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5분
    });

    await fs.writeFile(outputPath, response.data);

    console.log(`[Veo 3.1] ✅ 다운로드 완료: ${outputPath}`);

    return outputPath;
  }

  /**
   * 딜레이 헬퍼
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
