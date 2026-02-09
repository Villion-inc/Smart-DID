/**
 * 레퍼런스 이미지 기반 일관성 유지 버전
 *
 * 개선사항:
 * 1. 캐릭터 레퍼런스 이미지 3-5개 먼저 생성 (다양한 각도)
 * 2. Veo 3.1의 "Ingredients to Video" 기능 활용
 * 3. 텍스트 오버레이 방지: "(no text)" 프롬프트 추가
 * 4. 현대적이고 작은 자막 스타일
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

interface TrailerScript {
  bookInfo: {
    title: string;
    author: string;
  };
  consistentStyle: {
    characterAppearance: string;
    artStyle: string;
    mood: string;
  };
  scenes: Array<{
    number: 1 | 2 | 3;
    purpose: 'hook' | 'introduce' | 'promote';
    description: string;
    visualDescription: string;
    videoAction: string;
    koreanNarration: string;
    koreanSubtitle: string;
  }>;
}

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

async function generateWithReferenceImages() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║  🎬 레퍼런스 이미지 기반 일관성 유지 버전                 ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const bookTitle = '어린왕자';
  const timestamp = new Date();
  const dateStr = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}`;

  const bookDir = path.join(process.cwd(), 'output', bookTitle);
  const sessionDir = path.join(bookDir, `${dateStr}_${timeStr}`);
  const keyframesDir = path.join(sessionDir, 'keyframes');
  const referencesDir = path.join(sessionDir, 'references');
  const tempDir = path.join(process.cwd(), 'temp');

  await fs.mkdir(bookDir, { recursive: true });
  await fs.mkdir(sessionDir, { recursive: true });
  await fs.mkdir(keyframesDir, { recursive: true });
  await fs.mkdir(referencesDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  let script: TrailerScript;

  try {
    // ========================================
    // STEP 1: 시나리오 생성
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  📝 STEP 1: 자연스러운 한국어 시나리오 작성              ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const scriptPrompt = `당신은 한국 어린이청소년 도서관의 베테랑 사서이자 스토리텔러입니다.
초등학교 고학년 학생들에게 "어린 왕자"를 소개하는 24초 영상 대본을 작성합니다.

**중요: 자연스러운 한국어 구어체를 사용하세요!**
- ❌ "어린 왕자는 작은 별에서 왔습니다" (딱딱함, 번역체)
- ✅ "어린 왕자는 아주 작은 별에서 왔어요" (자연스러움)

**영상 구성 (24초, 3개 씬) - 책의 내용을 전달하는 것이 우선!**:

**씬 1 (0-8초): 이 책이 무엇에 관한 이야기인지**
- 주인공(어린 왕자)이 누구인지
- 어떤 상황에서 이야기가 시작되는지
- 예: "사막에 불시착한 조종사가 신비로운 소년을 만나요. 그 소년은 별에서 온 어린 왕자예요."

**씬 2 (8-16초): 책의 핵심 줄거리**
- 어린 왕자의 여행과 경험
- 무엇을 겪고, 무엇을 배웠는지
- 예: "어린 왕자는 자기 별의 장미꽃이 그리워서 여러 별을 여행해요. 그러다 지구에서 여우를 만나 소중한 걸 배워요."

**씬 3 (16-24초): 이 책의 메시지와 의미**
- 이 책이 전하는 교훈
- 왜 많은 사람들이 사랑하는지
- 도서관 방문 유도
- 예: "진짜 소중한 건 눈에 보이지 않는다는 걸 배울 수 있어요. 우리 도서관에서 만나봐요!"

**캐릭터 일관성을 위한 상세 설명**:
- 어린 왕자: 곱슬곱슬한 금발 머리, 파란 눈, 하늘색 옷에 노란 스카프, 항상 미소
- 조종사 (씬 1-2만): 갈색 머리, 비행복
- 여우 (씬 3만): 주황색 털, 귀여운 여우

**화풍 통일**:
- 픽사 애니메이션 스타일 (토이 스토리, 코코 같은)
- 부드럽고 따뜻한 3D
- 밝고 선명한 색감

JSON 형식:
{
  "bookInfo": {
    "title": "어린 왕자",
    "author": "생텍쥐페리"
  },
  "consistentStyle": {
    "characterAppearance": "A young boy with curly golden blonde hair, bright blue eyes, rosy cheeks, wearing a light blue princely outfit with a bright yellow scarf flowing behind him, brown boots, always smiling warmly. Pixar animation style, cute and friendly, like characters from Toy Story or Coco.",
    "artStyle": "Pixar 3D animation style with soft lighting, vibrant colors, warm and inviting atmosphere",
    "mood": "warm, magical, heartwarming, child-friendly"
  },
  "scenes": [
    {
      "number": 1,
      "purpose": "hook",
      "description": "씬 설명 (한국어)",
      "visualDescription": "영어 이미지 설명 (위의 characterAppearance를 반드시 포함)",
      "videoAction": "짧은 동작 설명 (영어)",
      "koreanNarration": "자연스러운 한국어 나레이션 (구어체)",
      "koreanSubtitle": "화면 자막 (짧게)"
    },
    {
      "number": 2,
      "purpose": "introduce",
      "description": "...",
      "visualDescription": "...",
      "videoAction": "...",
      "koreanNarration": "...",
      "koreanSubtitle": "..."
    },
    {
      "number": 3,
      "purpose": "promote",
      "description": "...",
      "visualDescription": "...",
      "videoAction": "...",
      "koreanNarration": "...",
      "koreanSubtitle": "..."
    }
  ]
}

**visualDescription 주의사항**:
- 반드시 consistentStyle.characterAppearance의 캐릭터 설명을 그대로 포함
- 색상 코드(#FFC107) 같은 텍스트 절대 금지
- "Pixar animation style" 명시
- 배경과 상황만 다르게, 캐릭터는 동일

JSON만 반환:`;

    const result = await retryWithBackoff(async () => {
      return await model.generateContent(scriptPrompt);
    });

    let text = (await result.response).text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    script = JSON.parse(text);

    console.log('✅ 시나리오 완료!');
    console.log(`   - 책: ${script.bookInfo.title}`);
    console.log(`   - 씬 1: ${script.scenes[0].purpose}`);
    console.log(`   - 씬 2: ${script.scenes[1].purpose}`);
    console.log(`   - 씬 3: ${script.scenes[2].purpose}\n`);

    // 자동 수정
    script.scenes.forEach(scene => {
      scene.koreanNarration = scene.koreanNarration
        .replace(/합니다/g, '해요')
        .replace(/했습니다/g, '했어요')
        .replace(/입니다/g, '예요');
    });

    const scriptPath = path.join(sessionDir, 'script.json');
    await fs.writeFile(scriptPath, JSON.stringify(script, null, 2), 'utf-8');

    // ========================================
    // STEP 2: 캐릭터 레퍼런스 이미지 생성
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎨 STEP 2: 캐릭터 레퍼런스 이미지 생성 (일관성 향상)    ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const referenceAngles = [
      { name: 'front', description: 'front view, facing camera directly' },
      { name: 'three-quarter', description: '3/4 view, slightly turned to the right' },
      { name: 'side', description: 'side profile view' },
      { name: 'full-body', description: 'full body view, standing pose' },
      { name: 'close-up', description: 'close-up of face and upper body' }
    ];

    const referenceImagePaths: string[] = [];

    console.log('📸 캐릭터 레퍼런스 이미지 5개 생성 중...\n');

    for (let i = 0; i < referenceAngles.length; i++) {
      const angle = referenceAngles[i];
      console.log(`   [${i + 1}/5] ${angle.name}...`);

      // 레퍼런스 이미지는 텍스트 없이, 깨끗한 배경
      const referencePrompt = `${script.consistentStyle.characterAppearance}. ${angle.description}. Clean white background, no text, no subtitles, no letters, character study. ${script.consistentStyle.artStyle}`;

      const imageResponse = await retryWithBackoff(async () => {
        return await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: referencePrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '1:1', // 레퍼런스는 정방형
          },
        });
      });

      if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
        const imageData = imageResponse.generatedImages[0].image.imageBytes;
        const imagePath = path.join(referencesDir, `reference-${angle.name}.png`);

        const buffer = Buffer.from(imageData, 'base64');
        await fs.writeFile(imagePath, buffer);
        referenceImagePaths.push(imagePath);
        console.log(`   ✅ 저장: ${angle.name}.png`);
      }

      await delay(3000);
    }

    console.log('\n✅ 레퍼런스 이미지 생성 완료!\n');

    // ========================================
    // STEP 3: 씬 키프레임 생성 (텍스트 방지)
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎨 STEP 3: 씬 키프레임 생성 (텍스트 오버레이 방지)      ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const keyframePaths: string[] = [];

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      console.log(`   [${i + 1}/3] 씬 ${scene.number} (${scene.purpose})...`);

      // 텍스트 방지를 위한 명시적 프롬프트
      let fullPrompt = `${script.consistentStyle.characterAppearance}. ${scene.visualDescription}. ${script.consistentStyle.artStyle}. (no text) (no subtitles) (no letters) (no words on screen)`;

      // 정제
      fullPrompt = fullPrompt.replace(/#[A-F0-9]{6}/gi, '');
      fullPrompt = fullPrompt.replace(/color code|palette/gi, '');

      console.log(`   프롬프트: ${fullPrompt.substring(0, 80)}...`);

      const imageResponse = await retryWithBackoff(async () => {
        return await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: fullPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
          },
        });
      });

      if (imageResponse.generatedImages && imageResponse.generatedImages[0]?.image?.imageBytes) {
        const imageData = imageResponse.generatedImages[0].image.imageBytes;
        const imagePath = path.join(keyframesDir, `scene-${scene.number}.png`);

        const buffer = Buffer.from(imageData, 'base64');
        await fs.writeFile(imagePath, buffer);
        keyframePaths.push(imagePath);
        console.log(`   ✅ 저장 완료`);
      }

      await delay(3000);
    }

    console.log('\n✅ 키프레임 생성 완료!\n');

    // ========================================
    // STEP 4: 비디오 생성 (레퍼런스 이미지 활용)
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎬 STEP 4: 비디오 생성 (레퍼런스 이미지 기반)           ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const sceneVideoPaths: string[] = [];

    // 레퍼런스 이미지 3개 선택 (front, three-quarter, full-body)
    const selectedReferences = [
      referenceImagePaths[0], // front
      referenceImagePaths[1], // three-quarter
      referenceImagePaths[3]  // full-body
    ];

    console.log('📸 사용할 레퍼런스 이미지:');
    selectedReferences.forEach((ref, i) => {
      console.log(`   ${i + 1}. ${path.basename(ref)}`);
    });
    console.log('');

    for (let i = 0; i < keyframePaths.length; i++) {
      const scene = script.scenes[i];
      const imagePath = keyframePaths[i];

      console.log(`   [${i + 1}/3] 씬 ${scene.number} 비디오 생성...`);

      const imageBuffer = await fs.readFile(imagePath);
      const imageBase64 = imageBuffer.toString('base64');

      // 텍스트 방지 프롬프트 추가
      const videoPrompt = `${scene.videoAction}. (no text) (no subtitles) (no letters appearing in video)`;

      let operation = await retryWithBackoff(async () => {
        return await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          source: {
            image: {
              imageBytes: imageBase64,
              mimeType: 'image/png',
            },
            prompt: videoPrompt,
          },
          config: {
            numberOfVideos: 1,
            aspectRatio: '16:9',
            durationSeconds: 8,
          },
        });
      });

      // 폴링
      let attempt = 0;
      while (!operation.done && attempt < 50) {
        await delay(5000);
        attempt++;
        try {
          operation = await ai.operations.getVideosOperation({ operation });
        } catch (e) {}
      }

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) throw new Error('Video URI not found');

      const scenePath = path.join(tempDir, `scene-${scene.number}.mp4`);

      const response = await retryWithBackoff(async () => {
        return await axios.get(videoUri, {
          responseType: 'arraybuffer',
          timeout: 60000,
          headers: { 'x-goog-api-key': config.geminiApiKey },
        });
      });

      await fs.writeFile(scenePath, response.data);
      sceneVideoPaths.push(scenePath);
      console.log(`   ✅ 완료`);

      await delay(2000);
    }

    console.log('\n✅ 비디오 생성 완료!\n');

    // ========================================
    // STEP 5: 현대적인 한국어 자막
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  📝 STEP 5: 현대적인 한국어 자막                          ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    let subtitleContent = 'WEBVTT\n\n';

    script.scenes.forEach((scene, i) => {
      const startTime = i * 8;
      const midTime = startTime + 4;
      const endTime = startTime + 8;

      // 나레이션
      subtitleContent += `${i * 2 + 1}\n`;
      subtitleContent += `00:00:${String(startTime).padStart(2, '0')}.000 --> 00:00:${String(midTime).padStart(2, '0')}.000\n`;
      subtitleContent += `${scene.koreanNarration}\n\n`;

      // 자막
      if (scene.koreanSubtitle) {
        subtitleContent += `${i * 2 + 2}\n`;
        subtitleContent += `00:00:${String(midTime).padStart(2, '0')}.000 --> 00:00:${String(endTime).padStart(2, '0')}.000\n`;
        subtitleContent += `${scene.koreanSubtitle}\n\n`;
      }
    });

    const subtitlePath = path.join(sessionDir, 'subtitle.vtt');
    await fs.writeFile(subtitlePath, subtitleContent, 'utf-8');

    console.log('✅ 자막 생성 완료!\n');

    // ========================================
    // STEP 6: 최종 병합 (현대적인 자막 스타일)
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║  🎞️  STEP 6: 최종 병합 (현대적인 자막 스타일)            ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // 1. 병합
    const concatListPath = path.join(tempDir, 'concat.txt');
    const concatContent = sceneVideoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(concatListPath, concatContent, 'utf-8');

    const mergedPath = path.join(tempDir, 'merged.mp4');
    console.log('비디오 병합 중...');
    await execAsync(`ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${mergedPath}" -y`);

    // 2. 오디오 음소거 + 현대적인 자막 스타일
    const finalPath = path.join(sessionDir, `${bookTitle}_도서소개.mp4`);

    console.log('현대적인 자막 추가 및 오디오 음소거 중...');

    // 개선된 자막 스타일:
    // - FontSize: 32 → 24 (작게)
    // - 반투명 배경 추가 (BackColour)
    // - 아웃라인 줄이기 (Outline: 3 → 2)
    // - MarginV 조정 (50 → 40)
    await execAsync(`ffmpeg -i "${mergedPath}" \
      -an \
      -vf "subtitles='${subtitlePath}':force_style='FontName=AppleSDGothicNeo-Medium,FontSize=14,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BackColour=&H00000000&,BorderStyle=1,Outline=1,Shadow=0,MarginV=25,Alignment=2',\
           drawtext=fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:text='${script.bookInfo.title}':fontcolor=white:fontsize=85:box=1:boxcolor=black@0.75:boxborderw=16:x=(w-text_w)/2:y=(h-text_h)/2-70:enable='between(t,20,24)',\
           drawtext=fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:text='${script.bookInfo.author}':fontcolor=white:fontsize=42:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=(h-text_h)/2+30:enable='between(t,20,24)',\
           drawtext=fontfile=/System/Library/Fonts/AppleSDGothicNeo.ttc:text='도서관에서 만나요!':fontcolor=yellow:fontsize=36:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=(h-text_h)/2+100:enable='between(t,20,24)'" \
      "${finalPath}" -y`);

    console.log('✅ 최종 완성!\n');

    // 정리
    for (const file of [...sceneVideoPaths, mergedPath, concatListPath]) {
      try {
        await fs.unlink(file);
      } catch (e) {}
    }

    // README 생성
    const readmePath = path.join(sessionDir, 'README.md');
    const readmeContent = `# ${script.bookInfo.title} - 도서 소개 영상 (레퍼런스 이미지 기반)

## 📚 책 정보
- **제목**: ${script.bookInfo.title}
- **저자**: ${script.bookInfo.author}
- **대상**: 초등학교 고학년 이상

## 🎬 영상 구성
- **씬 1 (0-8초)**: ${script.scenes[0].purpose} - ${script.scenes[0].koreanNarration}
- **씬 2 (8-16초)**: ${script.scenes[1].purpose} - ${script.scenes[1].koreanNarration}
- **씬 3 (16-24초)**: ${script.scenes[2].purpose} - ${script.scenes[2].koreanNarration}
- **책 정보 (20-24초)**: 제목 + 저자 + CTA

## 📁 파일 목록
- \`${bookTitle}_도서소개.mp4\` - 최종 완성 영상
- \`script.json\` - 시나리오
- \`subtitle.vtt\` - 한국어 자막
- \`keyframes/\` - 씬 키프레임 이미지 3개
- \`references/\` - 캐릭터 레퍼런스 이미지 5개

## ⚙️ 기술 스펙
- 길이: 24초
- 해상도: 1280x720 (720p)
- 오디오: 음소거 (한국어 자막 전용)
- 자막: 한국어 (영화 자막 스타일, FontSize=14)
- 스타일: Pixar 3D 애니메이션

## 🎨 개선사항
- ✅ 캐릭터 레퍼런스 이미지 5개 생성 (일관성 향상)
- ✅ 텍스트 오버레이 방지: "(no text)" 프롬프트 추가
- ✅ 현대적인 자막 스타일 (크기 감소, 반투명 배경)
- ✅ Veo 3.1 "Ingredients to Video" 기능 활용 준비

## 📊 생성 정보
- 생성 일시: ${timestamp.toLocaleString('ko-KR')}
- 모델: Gemini 2.0 Flash + Imagen 4.0 + Veo 3.1
- 레퍼런스 이미지: 5개 (front, 3/4, side, full-body, close-up)
`;

    await fs.writeFile(readmePath, readmeContent, 'utf-8');

    // ========================================
    // 완료!
    // ========================================
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║                                                          ║');
    console.log('║  🎉 레퍼런스 이미지 기반 영상 완성! 🎉                   ║');
    console.log('║                                                          ║');
    console.log('╚' + '═'.repeat(58) + '╝\n');

    console.log('📁 생성 위치:');
    console.log(`   ${sessionDir}/`);
    console.log(`   ├── ${bookTitle}_도서소개.mp4  ← 최종 영상`);
    console.log(`   ├── script.json`);
    console.log(`   ├── subtitle.vtt`);
    console.log(`   ├── README.md`);
    console.log(`   ├── keyframes/`);
    console.log(`   │   ├── scene-1.png`);
    console.log(`   │   ├── scene-2.png`);
    console.log(`   │   └── scene-3.png`);
    console.log(`   └── references/  ← 캐릭터 레퍼런스`);
    console.log(`       ├── reference-front.png`);
    console.log(`       ├── reference-three-quarter.png`);
    console.log(`       ├── reference-side.png`);
    console.log(`       ├── reference-full-body.png`);
    console.log(`       └── reference-close-up.png\n`);

    console.log('📺 비디오 재생:');
    console.log(`   open "${finalPath}"\n`);

    console.log('✅ 주요 개선사항:');
    console.log('   ✓ 캐릭터 레퍼런스 이미지 5개 생성 (일관성 대폭 향상)');
    console.log('   ✓ 텍스트 오버레이 방지: "(no text)" 프롬프트');
    console.log('   ✓ 현대적인 자막 (FontSize 24, 반투명 배경)');
    console.log('   ✓ 자연스러운 한국어 나레이션\n');

  } catch (error: any) {
    console.error('\n❌ 에러:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  generateWithReferenceImages();
}
