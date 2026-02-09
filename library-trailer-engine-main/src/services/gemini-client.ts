import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { Scene, ScenePromptPayload, GeminiVideoResponse } from '../types';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

/**
 * 스타일 가이드 인터페이스
 */
interface StyleGuide {
  characterDescription: string;
  colorPalette: string[];
  artStyle: string;
  mood: string;
  visualReference: string;
}

/**
 * 키 프레임 정보 인터페이스
 */
interface KeyFrame {
  sceneNumber: number;
  imagePrompt: string;
  imagePath?: string;
  imageData?: string; // base64
}

/**
 * Gemini API 클라이언트 서비스 (일관성 유지 전략 적용)
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private imageModel: any; // Imagen 3 모델

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    // Imagen 3를 사용한 이미지 생성
    this.imageModel = this.genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
  }

  /**
   * 책 정보를 기반으로 3개의 씬 프롬프트 생성
   * @param bookTitle 책 제목
   * @param author 저자
   * @param summary 요약
   * @returns 3개의 씬 프롬프트 배열
   */
  buildScenePrompts(
    bookTitle: string,
    author: string,
    summary: string
  ): ScenePromptPayload[] {
    const bookInfo = { title: bookTitle, author, summary };

    // Scene 1: 책 제목과 표지 소개 (0-8초)
    const scene1: Scene = {
      sceneNumber: 1,
      duration: 8,
      prompt: `Create a child-friendly, colorful animated scene introducing a book.
Book: "${bookTitle}" by ${author}
Show: A magical book opening with sparkles and bright colors. The book title "${bookTitle}" appears in large, playful Korean and English text. 
Style: Bright, warm colors, cartoon-style animation, kid-friendly aesthetic.
Duration: 8 seconds
No text on screen except the title.`,
      narration: `안녕하세요! 오늘은 "${bookTitle}"이라는 멋진 책을 소개할게요!`,
    };

    // Scene 2: 책 내용 요약 (8-16초)
    const scene2: Scene = {
      sceneNumber: 2,
      duration: 8,
      prompt: `Create a child-friendly animated scene showing the main story of the book.
Book: "${bookTitle}" by ${author}
Story: ${summary}
Show: Animated characters and scenes that represent the main plot. Use bright, cheerful colors and simple character designs suitable for children.
Style: Cartoon animation, vibrant colors, engaging movements.
Duration: 8 seconds
Focus on visual storytelling without text.`,
      narration: `이 책은 ${summary.substring(0, 50)}... 정말 재미있는 이야기랍니다!`,
    };

    // Scene 3: 마무리 및 행동 촉구 (16-24초)
    const scene3: Scene = {
      sceneNumber: 3,
      duration: 8,
      prompt: `Create a child-friendly animated scene with a call-to-action for reading.
Book: "${bookTitle}" by ${author}
Show: Happy children reading the book together, surrounded by stars and hearts. The book glows with a warm light. 
Text on screen: "함께 읽어요!" in playful Korean font.
Style: Bright, encouraging, warm colors, joyful expressions.
Duration: 8 seconds`,
      narration: `여러분도 이 책을 읽고 즐거운 상상의 세계로 떠나보세요! 함께 읽어요!`,
    };

    return [
      { scene: scene1, bookInfo },
      { scene: scene2, bookInfo },
      { scene: scene3, bookInfo },
    ];
  }

  /**
   * Gemini API를 호출하여 단일 씬에 대한 비디오 생성
   * @param payload 씬 프롬프트 페이로드
   * @param retryCount 재시도 횟수
   * @returns 비디오 응답 (현재는 텍스트 기반, 실제로는 비디오 데이터)
   */
  async generateSceneVideo(
    payload: ScenePromptPayload,
    retryCount: number = 0
  ): Promise<GeminiVideoResponse> {
    try {
      console.log(
        `[Gemini] Generating video for scene ${payload.scene.sceneNumber}...`
      );

      // Gemini API 호출
      // 참고: 현재 Gemini API는 직접적인 비디오 생성을 지원하지 않을 수 있습니다.
      // 이 경우 이미지 생성 후 비디오로 변환하거나, 텍스트 기반 설명을 생성합니다.
      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate a detailed scene description for video generation:
${payload.scene.prompt}

Narration (Korean): ${payload.scene.narration}

Provide a JSON response with:
- visualDescription: Detailed visual description
- cameraAngles: Camera movement suggestions
- colorPalette: Color scheme
- keyFrames: Key moments in the scene`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: config.gemini.temperature,
          maxOutputTokens: 1000,
        },
      });

      const response = await result.response;
      const text = response.text();

      console.log(
        `[Gemini] Scene ${payload.scene.sceneNumber} generated successfully`
      );

      // 실제 구현에서는 여기서 비디오 생성 API를 호출하거나
      // 이미지 생성 후 비디오로 변환하는 로직이 필요합니다.
      // 현재는 텍스트 설명을 반환합니다.
      return {
        videoData: text,
        success: true,
      };
    } catch (error: any) {
      console.error(
        `[Gemini] Error generating scene ${payload.scene.sceneNumber}:`,
        error.message
      );

      // 재시도 로직
      if (retryCount < config.gemini.maxRetries) {
        console.log(
          `[Gemini] Retrying... (${retryCount + 1}/${config.gemini.maxRetries})`
        );
        await this.delay(2000 * (retryCount + 1)); // 지수 백오프
        return this.generateSceneVideo(payload, retryCount + 1);
      }

      return {
        videoData: '',
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 3개 씬 모두 생성
   * @param bookTitle 책 제목
   * @param author 저자
   * @param summary 요약
   * @returns 3개 씬의 비디오 응답 배열
   */
  async generateAllScenes(
    bookTitle: string,
    author: string,
    summary: string
  ): Promise<{
    scenes: GeminiVideoResponse[];
    prompts: ScenePromptPayload[];
  }> {
    // 프롬프트 생성
    const prompts = this.buildScenePrompts(bookTitle, author, summary);

    console.log('[Gemini] Starting generation of all 3 scenes...');

    // 순차적으로 각 씬 생성 (병렬 처리 시 API 제한에 걸릴 수 있음)
    const scenes: GeminiVideoResponse[] = [];
    for (const prompt of prompts) {
      const sceneVideo = await this.generateSceneVideo(prompt);
      scenes.push(sceneVideo);

      // 실패 시 중단
      if (!sceneVideo.success) {
        throw new Error(
          `Failed to generate scene ${prompt.scene.sceneNumber}: ${sceneVideo.error}`
        );
      }
    }

    console.log('[Gemini] All scenes generated successfully!');

    return { scenes, prompts };
  }

  /**
   * 씬 설명을 기반으로 더미 비디오 파일 생성 (테스트용)
   * 실제 프로덕션에서는 실제 비디오 생성 서비스를 사용해야 합니다.
   * @param sceneResponse Gemini 응답
   * @param sceneNumber 씬 번호
   * @param outputPath 출력 경로
   */
  async createDummyVideoFromDescription(
    sceneResponse: GeminiVideoResponse,
    sceneNumber: number,
    outputPath: string
  ): Promise<void> {
    // 실제로는 Stable Diffusion Video, Runway ML, 또는 다른 비디오 생성 API를 사용
    // 현재는 텍스트 파일로 저장 (테스트용)
    const descriptionPath = outputPath.replace('.mp4', '.txt');
    await fs.writeFile(descriptionPath, sceneResponse.videoData as string, 'utf-8');
    console.log(`[Gemini] Scene ${sceneNumber} description saved to ${descriptionPath}`);
    
    // TODO: 실제 비디오 생성 로직 구현
    // 예: Stable Diffusion Video API, Runway ML, Leonardo.ai 등
  }

  /**
   * 딜레이 헬퍼 함수
   * @param ms 밀리초
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
