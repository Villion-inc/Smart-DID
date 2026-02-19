import { GeminiClient } from './gemini-client';
import { VideoProcessor } from './video-processor';
import { SubtitleGenerator } from './subtitle-generator';
import { config } from '../config';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  Scene,
  ScenePromptPayload,
} from '../types';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * 비디오 엔진 메인 서비스
 * Gemini API 호출, 비디오 처리, 자막 생성을 통합 관리
 */
export class VideoEngine {
  private geminiClient: GeminiClient;
  private videoProcessor: VideoProcessor;
  private subtitleGenerator: SubtitleGenerator;

  constructor() {
    this.geminiClient = new GeminiClient();
    this.videoProcessor = new VideoProcessor();
    this.subtitleGenerator = new SubtitleGenerator();
  }

  /**
   * 비디오 생성 메인 메서드
   * @param request 비디오 생성 요청
   * @returns 비디오 생성 응답
   */
  async generateVideo(
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    try {
      console.log('[VideoEngine] Starting video generation...');
      console.log(`[VideoEngine] Book: ${request.bookTitle} by ${request.author}`);

      // 1. 디렉토리 초기화
      await this.ensureDirectories();

      // 2. 고유 ID 생성
      const videoId = uuidv4().substring(0, 8);
      const outputFileName = `video-${videoId}`;

      // 3. Gemini API로 3개 씬 생성
      const { scenes, prompts } = await this.geminiClient.generateAllScenes(
        request.bookTitle,
        request.author,
        request.summary
      );

      // 4. 각 씬을 비디오로 변환 (더미 비디오 생성)
      const sceneVideoPaths = await this.createSceneVideos(prompts, videoId);

      // 5. 비디오 병합
      const tempMergedPath = path.join(
        config.tempDir,
        `${outputFileName}-merged.mp4`
      );
      await this.videoProcessor.concatenateVideos(sceneVideoPaths, tempMergedPath);

      // 6. 자막 생성
      const subtitlePath = path.join(
        config.outputDir,
        `${outputFileName}.vtt`
      );
      const scenesData: Scene[] = prompts.map((p) => p.scene);
      await this.subtitleGenerator.generateSubtitleFile(scenesData, subtitlePath);

      // 7. 자막 추가 (선택적 - 자막을 비디오에 하드코딩)
      // 또는 자막 파일만 별도로 제공
      const finalVideoPath = path.join(
        config.outputDir,
        `${outputFileName}.mp4`
      );

      // 자막을 비디오에 임베드하려면:
      // await this.videoProcessor.addSubtitles(tempMergedPath, subtitlePath, finalVideoPath);
      
      // 또는 자막 파일만 제공하려면 병합된 비디오를 최종 위치로 이동:
      await fs.copyFile(tempMergedPath, finalVideoPath);

      // 8. 비디오 길이 확인
      const duration = await this.videoProcessor.getVideoDuration(finalVideoPath);

      // 9. 임시 파일 정리
      await this.cleanupTempFiles([...sceneVideoPaths, tempMergedPath]);

      console.log('[VideoEngine] Video generation completed successfully!');

      return {
        success: true,
        videoPath: `/output/${outputFileName}.mp4`,
        subtitlePath: `/output/${outputFileName}.vtt`,
        duration: Math.round(duration),
      };
    } catch (error: any) {
      console.error('[VideoEngine] Error generating video:', error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 각 씬에 대한 비디오 파일 생성
   * @param prompts 씬 프롬프트 배열
   * @param videoId 비디오 ID
   * @returns 생성된 씬 비디오 경로 배열
   */
  private async createSceneVideos(
    prompts: ScenePromptPayload[],
    videoId: string
  ): Promise<string[]> {
    const videoPaths: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const sceneNumber = prompt.scene.sceneNumber;
      const scenePath = path.join(
        config.tempDir,
        `${videoId}-scene${sceneNumber}.mp4`
      );

      // 더미 비디오 생성 (실제로는 Gemini 응답을 비디오로 변환)
      await this.videoProcessor.createDummyVideo(
        prompt.scene.duration,
        `Scene ${sceneNumber}: ${prompt.bookInfo.title}`,
        scenePath
      );

      videoPaths.push(scenePath);
    }

    return videoPaths;
  }

  /**
   * 필요한 디렉토리 생성
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(config.tempDir, { recursive: true });
  }

  /**
   * 임시 파일 정리
   * @param filePaths 삭제할 파일 경로 배열
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    console.log('[VideoEngine] Cleaning up temporary files...');

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`[VideoEngine] Deleted: ${filePath}`);
      } catch (error) {
        console.warn(`[VideoEngine] Failed to delete ${filePath}:`, error);
      }
    }
  }
}
