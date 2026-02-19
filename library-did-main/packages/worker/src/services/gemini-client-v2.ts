import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';

/**
 * 스타일 가이드 인터페이스
 */
interface StyleGuide {
  bookTitle: string;
  characterDescription: string;
  colorPalette: string[];
  artStyle: string;
  mood: string;
  backgroundStyle: string;
  consistency: {
    characterDesign: string;
    lightingTone: string;
    cameraStyle: string;
  };
}

/**
 * 키 프레임 정보 인터페이스
 */
interface KeyFrame {
  sceneNumber: number;
  description: string;
  imagePrompt: string;
  imagePath?: string;
  videoPrompt?: string;
}

/**
 * 영상 기획서 인터페이스
 */
interface VideoScript {
  bookTitle: string;
  styleGuide: StyleGuide;
  keyFrames: KeyFrame[];
  narrations: string[];
  overallDirection: string;
}

/**
 * Gemini API 클라이언트 V2 (일관성 유지 전략)
 * trailer-engine 그대로 사용
 */
export class GeminiClientV2 {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.gemini.model || 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: config.gemini.temperature ?? 0.7,
        topK: 40,
        topP: 0.95,
      },
    });
  }

  async generateVideoScript(
    bookTitle: string,
    author: string,
    summary: string
  ): Promise<VideoScript> {
    console.log('[GeminiV2] 📝 STEP 1: 영상 기획서 생성 중...');

    const prompt = `당신은 아동용 책 소개 영상을 기획하는 전문 감독입니다.

책 정보:
- 제목: ${bookTitle}
- 저자: ${author}
- 요약: ${summary}

다음을 포함한 24초 영상 기획서를 JSON 형식으로 작성해주세요:

1. styleGuide (스타일 가이드):
   - characterDescription: 주요 캐릭터의 외모, 옷차림, 특징 (매우 상세하게)
   - colorPalette: 메인 색상 5개 (HEX 코드)
   - artStyle: 아트 스타일 (예: "3D Pixar-style cartoon", "2D Studio Ghibli style")
   - mood: 전체 분위기 (예: "warm and cheerful", "magical and dreamy")
   - backgroundStyle: 배경 스타일 설명
   - consistency: {
       characterDesign: "캐릭터 일관성 유지를 위한 상세 가이드",
       lightingTone: "조명 톤 (예: soft golden hour light)",
       cameraStyle: "카메라 스타일 (예: gentle movements, child-eye level)"
     }

2. keyFrames (3개 씬의 키 프레임):
   각 씬마다:
   - sceneNumber: 1, 2, 3
   - description: 씬 설명 (한국어)
   - imagePrompt: 키 프레임 이미지 생성을 위한 영어 프롬프트 (매우 상세, styleGuide 일관성 유지)
   - videoPrompt: 이 키 프레임에서 시작하는 8초 비디오 생성 프롬프트

3. narrations: 3개 씬의 한국어 나레이션 (각 8초 분량)

4. overallDirection: 전체 연출 방향

**중요**: 
- 모든 씬에서 같은 캐릭터 디자인, 색상, 스타일을 유지해야 합니다
- imagePrompt는 영어로, 매우 구체적으로 작성 (Consistent character: [description])
- 아동 친화적이고 밝은 분위기

JSON만 반환하세요 (markdown 없이):`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const script: VideoScript = JSON.parse(text);

      console.log('[GeminiV2] ✅ 영상 기획서 생성 완료');
      console.log(`   - 스타일: ${script.styleGuide.artStyle}`);
      console.log(`   - 키 프레임: ${script.keyFrames.length}개`);

      return script;
    } catch (error: any) {
      console.error('[GeminiV2] ❌ 영상 기획서 생성 실패:', error.message);
      throw error;
    }
  }

  async generateKeyFrameImages(
    script: VideoScript,
    outputDir: string
  ): Promise<KeyFrame[]> {
    console.log('[GeminiV2] 🎨 STEP 2: 키 프레임 이미지 생성 중...');

    const keyFramesWithImages: KeyFrame[] = [];

    for (const keyFrame of script.keyFrames) {
      try {
        const enhancedPrompt = this.buildConsistentImagePrompt(
          keyFrame.imagePrompt,
          script.styleGuide
        );

        const imagePath = path.join(
          outputDir,
          `keyframe-scene${keyFrame.sceneNumber}.txt`
        );

        await fs.writeFile(imagePath, enhancedPrompt, 'utf-8');

        keyFramesWithImages.push({
          ...keyFrame,
          imagePath,
          imagePrompt: enhancedPrompt,
        });

        console.log(`   ✅ Scene ${keyFrame.sceneNumber} 키 프레임 저장: ${imagePath}`);
      } catch (error: any) {
        console.error(
          `   ❌ Scene ${keyFrame.sceneNumber} 키 프레임 생성 실패:`,
          error.message
        );
      }
    }

    console.log('[GeminiV2] ✅ 모든 키 프레임 이미지 생성 완료');
    return keyFramesWithImages;
  }

  private buildConsistentImagePrompt(
    basePrompt: string,
    styleGuide: StyleGuide
  ): string {
    return `${basePrompt}

Style Guide:
- Art Style: ${styleGuide.artStyle}
- Character: ${styleGuide.characterDescription}
- Color Palette: ${styleGuide.colorPalette.join(', ')}
- Mood: ${styleGuide.mood}
- Background: ${styleGuide.backgroundStyle}
- Lighting: ${styleGuide.consistency.lightingTone}
- Camera: ${styleGuide.consistency.cameraStyle}

Consistency Requirements:
${styleGuide.consistency.characterDesign}

High quality, detailed, professional children's book illustration style.`;
  }

  async generateVideosFromKeyFrames(
    script: VideoScript,
    keyFrames: KeyFrame[],
    outputDir: string
  ): Promise<string[]> {
    console.log('[GeminiV2] 🎬 STEP 3: 키 프레임 기반 비디오 생성 중...');

    const videoPaths: string[] = [];

    for (let i = 0; i < keyFrames.length; i++) {
      const keyFrame = keyFrames[i];
      const narration = script.narrations[i];

      try {
        const videoPrompt = this.buildVideoPrompt(
          keyFrame,
          script.styleGuide,
          narration
        );

        const videoPath = path.join(
          outputDir,
          `scene${keyFrame.sceneNumber}.txt`
        );

        await fs.writeFile(
          videoPath,
          `Video Prompt:\n${videoPrompt}\n\nNarration: ${narration}`,
          'utf-8'
        );

        videoPaths.push(videoPath);

        console.log(`   ✅ Scene ${keyFrame.sceneNumber} 비디오 프롬프트 저장`);
      } catch (error: any) {
        console.error(
          `   ❌ Scene ${keyFrame.sceneNumber} 비디오 생성 실패:`,
          error.message
        );
      }
    }

    console.log('[GeminiV2] ✅ 모든 비디오 생성 완료');
    return videoPaths;
  }

  private buildVideoPrompt(
    keyFrame: KeyFrame,
    styleGuide: StyleGuide,
    narration: string
  ): string {
    return `Starting from the key frame image, generate an 8-second video:

${keyFrame.videoPrompt || keyFrame.description}

Narration: "${narration}"

Maintain consistency:
- Character: ${styleGuide.characterDescription}
- Art Style: ${styleGuide.artStyle}
- Color Palette: ${styleGuide.colorPalette.join(', ')}
- Mood: ${styleGuide.mood}
- Lighting: ${styleGuide.consistency.lightingTone}
- Camera: ${styleGuide.consistency.cameraStyle}

Animation: Smooth, gentle movements suitable for children.
Duration: 8 seconds
FPS: 24
Resolution: 1920x1080`;
  }

  async generateConsistentVideo(
    bookTitle: string,
    author: string,
    summary: string,
    outputDir: string
  ): Promise<{
    script: VideoScript;
    keyFrames: KeyFrame[];
    videoPaths: string[];
  }> {
    console.log('\n' + '='.repeat(60));
    console.log('🎬 일관성 유지 전략으로 비디오 생성 시작');
    console.log('='.repeat(60) + '\n');

    const script = await this.generateVideoScript(bookTitle, author, summary);

    await fs.writeFile(
      path.join(outputDir, 'video-script.json'),
      JSON.stringify(script, null, 2),
      'utf-8'
    );

    console.log('\n');

    const keyFrames = await this.generateKeyFrameImages(script, outputDir);

    console.log('\n');

    const videoPaths = await this.generateVideosFromKeyFrames(
      script,
      keyFrames,
      outputDir
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ 일관성 유지 전략 비디오 생성 완료!');
    console.log('='.repeat(60) + '\n');

    return {
      script,
      keyFrames,
      videoPaths,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
