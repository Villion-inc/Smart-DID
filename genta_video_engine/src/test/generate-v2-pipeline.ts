/**
 * V2 Pipeline Test Script
 *
 * Tests the new pipeline with:
 * 1. Book Grounding (Google Books API)
 * 2. Style Bible (IP-free visual anchors)
 * 3. Scene Planning V2
 * 4. Hierarchical Retry
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

// V2 Pipeline imports
import { groundBook } from '../pipeline/grounding';
import { buildStyleBible, applyStyleToPrompt } from '../pipeline/style/styleBible';
import { planScenes, generateSceneScripts } from '../pipeline/planning';
import {
  createRetryState,
  recordStageSuccess,
  recordStageFailure,
  getRetryStateSummary,
} from '../worker/hierarchicalRetry';
import { BookFacts, StyleBible, SceneScriptV2 } from '../shared/types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      const delayMs = baseDelay * Math.pow(2, i);
      console.log(`   ⏳ 재시도 ${i + 1}/${maxRetries} (${delayMs}ms 후)...`);
      await delay(delayMs);
    }
  }
  throw new Error('Retry failed');
}

type PipelineMode = 'quality' | 'fast';

interface GenerateOptions {
  title: string;
  author?: string;
  language?: 'ko' | 'en';
  skipVideo?: boolean;
  mode?: PipelineMode;
}

const MODE_CONFIG = {
  quality: {
    name: '🎨 Quality Mode (최고 품질)',
    description: '레퍼런스 이미지 생성, 최대 일관성, 느림',
    referenceImages: true,
    referenceAngles: [
      { name: 'front', description: 'front view, facing camera directly, full upper body visible' },
      { name: 'three-quarter', description: '3/4 view, slightly turned to the right, expressive pose' },
      { name: 'side', description: 'side profile view, walking pose' },
      { name: 'full-body', description: 'full body view, standing pose, showing complete outfit' },
      { name: 'close-up', description: 'close-up of face, detailed expression' },
    ],
    retryLimits: { script: 3, keyframe: 3, video: 2 },
    estimatedTime: '7-10분',
    estimatedCost: '$1.30',
  },
  fast: {
    name: '⚡ Fast Mode (빠른 생성)',
    description: '레퍼런스 이미지 생략, 빠름, 일관성 약간 낮음',
    referenceImages: false,
    referenceAngles: [],
    retryLimits: { script: 2, keyframe: 2, video: 1 },
    estimatedTime: '3-5분',
    estimatedCost: '$1.05',
  },
};

async function generateWithV2Pipeline(options: GenerateOptions) {
  const { title, author, language = 'ko', skipVideo = false, mode = 'fast' } = options;
  const modeConfig = MODE_CONFIG[mode];

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║  🎬 V2 Pipeline: 책 제목 → 자동 트레일러 생성            ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`📚 입력 정보:`);
  console.log(`   - 제목: "${title}"`);
  console.log(`   - 저자: ${author || '(자동 검색)'}`);
  console.log(`   - 언어: ${language}`);
  console.log(`   - 모드: ${modeConfig.name}`);
  console.log(`   - 예상 시간: ${modeConfig.estimatedTime}`);
  console.log(`   - 예상 비용: ${modeConfig.estimatedCost}\n`);

  const timestamp = new Date();
  const dateStr = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}`;

  const outputDir = path.join(process.cwd(), 'output', title.replace(/[^\w가-힣]/g, '_'), `${dateStr}_${timeStr}`);
  const keyframesDir = path.join(outputDir, 'keyframes');
  const referencesDir = path.join(outputDir, 'references');
  const tempDir = path.join(process.cwd(), 'temp');

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(keyframesDir, { recursive: true });
  await fs.mkdir(referencesDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  try {
    // ========================================
    // STEP 0: Book Grounding
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  📖 STEP 0: Book Grounding (Google Books API)            ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const groundingResult = await groundBook(title, author);

    if (!groundingResult) {
      throw new Error(`책을 찾을 수 없습니다: "${title}"`);
    }

    const { bookFacts, candidate } = groundingResult;

    console.log('✅ 책 정보 확인 완료!');
    console.log(`   - 정확한 제목: ${bookFacts.canonicalTitle}`);
    console.log(`   - 저자: ${bookFacts.author}`);
    console.log(`   - 신뢰도: ${(bookFacts.sourceConfidence * 100).toFixed(0)}%`);
    console.log(`   - 줄거리: ${bookFacts.logline.substring(0, 50)}...`);
    console.log(`   - 주인공: ${bookFacts.mainCharacters.map(c => c.name).join(', ')}\n`);

    // Save book facts
    await fs.writeFile(
      path.join(outputDir, 'bookFacts.json'),
      JSON.stringify(bookFacts, null, 2),
      'utf-8'
    );

    // ========================================
    // STEP 1: Style Bible Generation
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎨 STEP 1: Style Bible 생성 (IP 보호)                   ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const styleBible = await buildStyleBible(bookFacts);

    console.log('✅ Style Bible 생성 완료!');
    console.log(`   - Art Style: ${styleBible.artDirection.artStyle.substring(0, 50)}...`);
    console.log(`   - 색상: ${styleBible.artDirection.paletteKeywords.join(', ')}`);
    console.log(`   - 주인공: ${styleBible.visualAnchors.protagonistDesign.substring(0, 50)}...`);
    console.log(`   - 금지 브랜드: ${styleBible.forbiddenBrands.slice(0, 3).join(', ')}...\n`);

    // Save style bible
    await fs.writeFile(
      path.join(outputDir, 'styleBible.json'),
      JSON.stringify(styleBible, null, 2),
      'utf-8'
    );

    // ========================================
    // STEP 2: Scene Planning
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  📝 STEP 2: Scene Planning (Hook/Journey/Promise)        ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const scenePlans = await planScenes(bookFacts, styleBible);

    console.log('✅ Scene Plans 생성 완료!');
    scenePlans.forEach((plan) => {
      console.log(`   - Scene ${plan.sceneNumber} (${plan.sceneRole}): ${plan.objective}`);
    });
    console.log('');

    // Save scene plans
    await fs.writeFile(
      path.join(outputDir, 'scenePlans.json'),
      JSON.stringify(scenePlans, null, 2),
      'utf-8'
    );

    // ========================================
    // STEP 3: Scene Scripts Generation
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  📜 STEP 3: Scene Scripts 생성                           ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const scripts = await generateSceneScripts(bookFacts, styleBible, scenePlans);

    console.log('✅ Scene Scripts 생성 완료!');
    scripts.forEach((script) => {
      console.log(`   - Scene ${script.sceneNumber} (${script.sceneRole}):`);
      console.log(`     나레이션: "${script.narration.substring(0, 30)}..."`);
    });
    console.log('');

    // Save scripts
    await fs.writeFile(
      path.join(outputDir, 'scripts.json'),
      JSON.stringify(scripts, null, 2),
      'utf-8'
    );

    // ========================================
    // STEP 4: Character Reference Images (Quality Mode Only)
    // ========================================
    const referenceImagePaths: string[] = [];

    if (modeConfig.referenceImages) {
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║  🖼️ STEP 4: 캐릭터 레퍼런스 이미지 생성 (Quality Mode)  ║');
      console.log('╚' + '═'.repeat(58) + '╝\n');

      const referenceAngles = modeConfig.referenceAngles;

      for (let i = 0; i < referenceAngles.length; i++) {
        const angle = referenceAngles[i];
        console.log(`   [${i + 1}/${referenceAngles.length}] ${angle.name}...`);

        const referencePrompt = applyStyleToPrompt(
          `${angle.description}. Clean white background, character study, high detail.`,
          styleBible,
          true
        );

        try {
          const imageResponse = await retryWithBackoff(async () => {
            return await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: referencePrompt,
              config: {
                numberOfImages: 1,
                aspectRatio: '1:1',
              },
            });
          });

          if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
            const imageData = imageResponse.generatedImages[0].image.imageBytes;
            const imagePath = path.join(referencesDir, `reference-${angle.name}.png`);

            const buffer = Buffer.from(imageData, 'base64');
            await fs.writeFile(imagePath, buffer);
            referenceImagePaths.push(imagePath);
            console.log(`   ✅ 저장: reference-${angle.name}.png`);
          }
        } catch (error: any) {
          console.log(`   ⚠️ ${angle.name} 생성 실패: ${error.message}`);
        }

        await delay(2000);
      }

      console.log(`\n✅ 레퍼런스 이미지 생성 완료! (${referenceImagePaths.length}/${referenceAngles.length}장)\n`);
    } else {
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║  ⏭️ STEP 4: 레퍼런스 이미지 생략 (Fast Mode)            ║');
      console.log('╚' + '═'.repeat(58) + '╝\n');
    }

    // ========================================
    // STEP 5: Scene Keyframes
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎨 STEP 5: 씬 키프레임 생성                              ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const keyframePaths: string[] = [];

    for (let i = 0; i < scripts.length; i++) {
      const script = scripts[i];
      console.log(`   [${i + 1}/3] Scene ${script.sceneNumber} (${script.sceneRole})...`);

      const imageResponse = await retryWithBackoff(async () => {
        return await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: script.keyframePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
          },
        });
      });

      if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
        const imageData = imageResponse.generatedImages[0].image.imageBytes;
        const imagePath = path.join(keyframesDir, `scene-${script.sceneNumber}.png`);

        const buffer = Buffer.from(imageData, 'base64');
        await fs.writeFile(imagePath, buffer);
        keyframePaths.push(imagePath);
        console.log(`   ✅ 저장: scene-${script.sceneNumber}.png`);
      }

      await delay(3000);
    }

    console.log('\n✅ 키프레임 생성 완료!\n');

    if (skipVideo) {
      console.log('⏭️ 비디오 생성 건너뜀 (--skip-video 옵션)\n');
    } else {
      // ========================================
      // STEP 6: Video Generation with Hierarchical Retry
      // ========================================
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║  🎬 STEP 6: 비디오 생성 (Hierarchical Retry)             ║');
      console.log('╚' + '═'.repeat(58) + '╝\n');

      let retryState = createRetryState('test-job');
      const sceneVideoPaths: string[] = [];

      for (let i = 0; i < keyframePaths.length; i++) {
        const script = scripts[i];
        const imagePath = keyframePaths[i];

        console.log(`   [${i + 1}/3] Scene ${script.sceneNumber} 비디오 생성...`);

        const imageBuffer = await fs.readFile(imagePath);
        const imageBase64 = imageBuffer.toString('base64');

        let operation = await retryWithBackoff(async () => {
          return await ai.models.generateVideos({
            model: 'veo-3.1-generate-preview',
            source: {
              image: {
                imageBytes: imageBase64,
                mimeType: 'image/png',
              },
              prompt: script.videoPrompt,
            },
            config: {
              numberOfVideos: 1,
              aspectRatio: '16:9',
              durationSeconds: 8,
            },
          });
        });

        // Poll for completion
        let attempt = 0;
        while (!operation.done && attempt < 50) {
          await delay(5000);
          attempt++;
          try {
            operation = await ai.operations.getVideosOperation({ operation });
          } catch (e) {}
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) {
          const result = recordStageFailure(retryState, script.sceneNumber, 'video', 'Video URI not found');
          retryState = result.state;
          console.log(`   ❌ Scene ${script.sceneNumber} 비디오 생성 실패`);
          continue;
        }

        const scenePath = path.join(tempDir, `scene-${script.sceneNumber}.mp4`);

        const response = await retryWithBackoff(async () => {
          return await axios.get(videoUri, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: { 'x-goog-api-key': config.geminiApiKey },
          });
        });

        await fs.writeFile(scenePath, response.data);
        sceneVideoPaths.push(scenePath);
        retryState = recordStageSuccess(retryState, script.sceneNumber, 'video', {});
        console.log(`   ✅ Scene ${script.sceneNumber} 비디오 완료`);

        await delay(2000);
      }

      console.log(`\n📊 Retry 상태: ${getRetryStateSummary(retryState)}`);
      console.log('✅ 비디오 생성 완료!\n');

      // ========================================
      // STEP 7: Subtitle Generation
      // ========================================
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║  📝 STEP 7: 자막 생성                                    ║');
      console.log('╚' + '═'.repeat(58) + '╝\n');

      let subtitleContent = 'WEBVTT\n\n';

      scripts.forEach((script, i) => {
        const startTime = i * 8;
        const endTime = startTime + 8;

        subtitleContent += `${i + 1}\n`;
        subtitleContent += `00:00:${String(startTime).padStart(2, '0')}.000 --> 00:00:${String(endTime).padStart(2, '0')}.000\n`;
        subtitleContent += `${script.narration}\n\n`;
      });

      const subtitlePath = path.join(outputDir, 'subtitle.vtt');
      await fs.writeFile(subtitlePath, subtitleContent, 'utf-8');

      console.log('✅ 자막 생성 완료!\n');

      // ========================================
      // STEP 8: Final Merge
      // ========================================
      console.log('╔' + '═'.repeat(58) + '╗');
      console.log('║  🎞️ STEP 8: 최종 병합                                    ║');
      console.log('╚' + '═'.repeat(58) + '╝\n');

      if (sceneVideoPaths.length === 3) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const concatListPath = path.join(tempDir, 'concat.txt');
        const concatContent = sceneVideoPaths.map((p) => `file '${p}'`).join('\n');
        await fs.writeFile(concatListPath, concatContent, 'utf-8');

        const mergedPath = path.join(tempDir, 'merged.mp4');
        console.log('비디오 병합 중...');
        await execAsync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${mergedPath}" -y`);

        const finalPath = path.join(outputDir, `${bookFacts.canonicalTitle.replace(/[^\w가-힣]/g, '_')}_도서소개_v2.mp4`);

        console.log('자막 추가 중...');
        // 영화 자막 스타일: 작은 글씨, 하단 배치, 얇은 테두리
        await execAsync(`ffmpeg -i "${mergedPath}" \
          -an \
          -vf "subtitles='${subtitlePath}':force_style='FontName=AppleSDGothicNeo-Medium,FontSize=14,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BackColour=&H00000000&,BorderStyle=1,Outline=1,Shadow=0,MarginV=25,Alignment=2'" \
          "${finalPath}" -y`);

        console.log('✅ 최종 영상 생성 완료!\n');

        // Cleanup temp files
        for (const file of [...sceneVideoPaths, mergedPath, concatListPath]) {
          try {
            await fs.unlink(file);
          } catch (e) {}
        }
      } else {
        console.log('⚠️ 일부 씬 생성 실패로 병합 건너뜀\n');
      }
    }

    // ========================================
    // Generate README
    // ========================================
    const readmePath = path.join(outputDir, 'README.md');
    const readmeContent = `# ${bookFacts.canonicalTitle} - V2 Pipeline 도서 소개 영상

## 📚 책 정보
- **제목**: ${bookFacts.canonicalTitle}
- **저자**: ${bookFacts.author}
- **대상**: ${bookFacts.targetAudience}
- **줄거리**: ${bookFacts.logline}

## 🎬 영상 구성
${scripts.map((s) => `- **Scene ${s.sceneNumber} (${s.sceneRole})**: ${s.narration.substring(0, 50)}...`).join('\n')}

## 🎨 스타일
- **Art Style**: ${styleBible.artDirection.artStyle.substring(0, 100)}...
- **Color Palette**: ${styleBible.artDirection.paletteKeywords.join(', ')}
- **Lighting**: ${styleBible.artDirection.lightingMood}

## 📁 파일 목록
- \`bookFacts.json\` - 책 정보 (Google Books API)
- \`styleBible.json\` - 스타일 가이드
- \`scenePlans.json\` - 씬 계획
- \`scripts.json\` - 씬 스크립트
- \`keyframes/\` - 씬 키프레임 이미지
- \`references/\` - 캐릭터 레퍼런스 이미지

## ⚙️ V2 Pipeline 특징
- ✅ 책 제목만으로 자동 정보 추출 (Book Grounding)
- ✅ IP 보호 (Pixar, Disney 등 브랜드 미언급)
- ✅ 일관된 캐릭터/배경 (Visual Anchors)
- ✅ 스포일러 방지
- ✅ Hierarchical Retry

## 📊 생성 정보
- 생성 일시: ${timestamp.toLocaleString('ko-KR')}
- 생성 모드: ${modeConfig.name}
- 레퍼런스 이미지: ${modeConfig.referenceImages ? `${referenceImagePaths.length}장` : '생략 (Fast Mode)'}
- 신뢰도: ${(bookFacts.sourceConfidence * 100).toFixed(0)}%
- 모델: Gemini 2.0 Flash + Imagen 4.0 + Veo 3.1
`;

    await fs.writeFile(readmePath, readmeContent, 'utf-8');

    // ========================================
    // Summary
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║                                                          ║');
    console.log('║  🎉 V2 Pipeline 완료!                                    ║');
    console.log('║                                                          ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    console.log('📁 생성 위치:');
    console.log(`   ${outputDir}/\n`);

    console.log(`✅ 생성 모드: ${modeConfig.name}`);
    if (modeConfig.referenceImages) {
      console.log(`   ✓ 레퍼런스 이미지: ${referenceImagePaths.length}장 (최대 일관성)`);
    } else {
      console.log('   ✓ 레퍼런스 이미지: 생략 (빠른 생성)');
    }
    console.log('   ✓ IP 보호 (브랜드명 미사용)');
    console.log('   ✓ 일관된 캐릭터/배경 (Visual Anchors)');
    console.log('   ✓ 스포일러 방지\n');

  } catch (error: any) {
    console.error('\n❌ 에러:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI parsing
const args = process.argv.slice(2);
let title = '어린왕자';
let author: string | undefined;
let skipVideo = false;
let mode: PipelineMode = 'fast';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title' && args[i + 1]) {
    title = args[i + 1];
    i++;
  } else if (args[i] === '--author' && args[i + 1]) {
    author = args[i + 1];
    i++;
  } else if (args[i] === '--skip-video') {
    skipVideo = true;
  } else if (args[i] === '--mode' && args[i + 1]) {
    if (args[i + 1] === 'quality' || args[i + 1] === 'fast') {
      mode = args[i + 1] as PipelineMode;
    }
    i++;
  } else if (args[i] === '--quality') {
    mode = 'quality';
  } else if (args[i] === '--fast') {
    mode = 'fast';
  }
}

if (require.main === module) {
  console.log('🚀 V2 Pipeline 테스트 시작\n');
  console.log('사용법:');
  console.log('  npx ts-node src/test/generate-v2-pipeline.ts --title "책제목" [옵션]');
  console.log('');
  console.log('옵션:');
  console.log('  --mode quality  🎨 최고 품질 (레퍼런스 이미지 5장, 7-10분, $1.30)');
  console.log('  --mode fast     ⚡ 빠른 생성 (레퍼런스 생략, 3-5분, $1.05)');
  console.log('  --quality       --mode quality 단축어');
  console.log('  --fast          --mode fast 단축어 (기본값)');
  console.log('  --skip-video    비디오 생성 건너뛰기');
  console.log('  --author "저자" 저자 지정');
  console.log('');

  generateWithV2Pipeline({ title, author, skipVideo, mode });
}

export { generateWithV2Pipeline };
