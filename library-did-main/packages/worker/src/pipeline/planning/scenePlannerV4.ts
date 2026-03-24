/**
 * Scene Planner V4 - 5-Element Story Structure
 * Generates: storyLine + tagline + bookMeta + 5 scenes
 * Ported from trailer-engine/src/pipeline/planning/scenePlannerV4.ts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { BookFacts, StyleBible } from '../../shared/types';
import {
  SceneScriptV4,
  SharedAnchorsV3,
  TrailerTagline,
  BookMeta,
  V4ScriptResult,
  SceneRoleV4,
  OverlayStyleV4,
} from '../../types/v7';

/**
 * Generate V4 scripts: 5 scenes + storyLine + tagline + bookMeta
 */
export async function generateV4Scripts(
  bookFacts: BookFacts,
  styleBible: StyleBible,
  pastLessons?: string
): Promise<V4ScriptResult> {
  console.log(`[PlannerV4] Generating 5-scene trailer for: "${bookFacts.canonicalTitle}"`);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.gemini.model });

  let prompt = buildV4Prompt(bookFacts, styleBible);
  if (pastLessons) {
    prompt = pastLessons + '\n\n---\n\n' + prompt;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 8000 },
      });

      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const parsed = JSON.parse(text);

      // storyLine 길이 검증 (50자)
      let storyLine: string = parsed.storyLine || '';
      if (storyLine.length > 50) {
        storyLine = await shortenText(storyLine, 50, '줄거리 소개', bookFacts);
      }
      if (storyLine.length > 50) {
        storyLine = storyLine.substring(0, 50);
      }

      // tagline 길이 검증 (35자)
      let tagline: TrailerTagline = parsed.tagline || { text: '', emotion: '' };
      if (tagline.text.length > 35) {
        tagline.text = await shortenText(tagline.text, 35, '감성 태그라인', bookFacts);
      }
      if (tagline.text.length > 35) {
        tagline.text = tagline.text.substring(0, 35);
      }

      const bookMeta: BookMeta = {
        genre: parsed.bookMeta?.genre || '동화',
        ageGroup: parsed.bookMeta?.ageGroup || '초등 3~6학년',
        publisher: parsed.bookMeta?.publisher,
      };

      const sharedAnchors: SharedAnchorsV3 = {
        protagonistDesign: styleBible.visualAnchors.protagonistDesign,
        primaryLocation: styleBible.visualAnchors.primaryLocation,
        artStylePrefix: styleBible.artStylePrefix,
        colorPalette: styleBible.artDirection.paletteKeywords.slice(0, 5).join(', '),
        lightingMood: styleBible.artDirection.lightingMood,
      };

      const roleMap: SceneRoleV4[] = ['world', 'character', 'story', 'message', 'title'];
      const overlayStyleMap: OverlayStyleV4[] = ['none', 'book-meta', 'story-line', 'trailer-title', 'book-title'];

      const scenes: SceneScriptV4[] = (parsed.scenes as any[]).map((s: any, i: number) => {
        const num = (i + 1) as 1 | 2 | 3 | 4 | 5;
        const role = roleMap[i];
        const overlayStyle = overlayStyleMap[i];

        let overlayText: string | undefined;
        let overlaySubText: string | undefined;

        if (role === 'character') {
          overlayText = `${bookMeta.genre} · ${bookMeta.ageGroup}`;
        } else if (role === 'story') {
          overlayText = storyLine;
        } else if (role === 'message') {
          overlayText = tagline.text;
        } else if (role === 'title') {
          overlayText = bookFacts.canonicalTitle;
          const authorParts = [bookFacts.author];
          if (bookMeta.publisher) authorParts.push(bookMeta.publisher);
          overlaySubText = authorParts.join(' · ');
        }

        return {
          sceneNumber: num,
          role,
          visualDescription: s.visualDescription,
          videoPrompt: s.videoPrompt,
          keyframePrompt: s.keyframePrompt,
          overlayText,
          overlaySubText,
          overlayStyle,
          sharedAnchors,
          duration: 4 as const,
        };
      });

      console.log(`[PlannerV4] ✅ 5 scenes + storyLine + tagline + bookMeta generated`);
      return { scenes, storyLine, tagline, bookMeta };
    } catch (error: any) {
      console.warn(`[PlannerV4] ⚠️ Parse attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt === maxRetries) {
        throw new Error(`[PlannerV4] All parse attempts failed: ${error.message}`);
      }
    }
  }

  throw new Error('[PlannerV4] Unreachable');
}

async function shortenText(
  text: string,
  maxLen: number,
  label: string,
  bookFacts: BookFacts
): Promise<string> {
  console.log(`[PlannerV4] ⚠️ ${label} too long (${text.length}자), shortening...`);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: config.gemini.model });

  const prompt = `다음 텍스트를 ${maxLen}자 이내로 줄여주세요. 핵심 의미 유지.
원본: "${text}"
책: ${bookFacts.canonicalTitle}
${maxLen}자 이내 텍스트만 반환 (따옴표 없이):`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
  });

  let shortened = result.response.text().trim().replace(/^["']|["']$/g, '');
  if (shortened.length > maxLen) {
    shortened = shortened.substring(0, maxLen);
  }

  return shortened;
}

function buildV4Prompt(bookFacts: BookFacts, styleBible: StyleBible): string {
  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');

  return `당신은 아름다운 동화책 일러스트를 영상으로 만드는 AI 영상 감독입니다.

목표: 20초짜리 확장 예고편(트레일러)을 기획합니다.
기존 12초 버전보다 깊이 있는 서사를 전달하며,
시청자가 영상만 보고도 "이 책이 어떤 이야기인지" 알 수 있게 합니다.
마치 고급 동화책의 페이지가 살아 움직이는 것처럼 아름답게.

## 핵심 미학: 동화책 일러스트레이션
- 모든 장면이 수채화/과슈로 그린 동화책 삽화처럼 보여야 합니다
- 따뜻한 금빛 기조, 부드러운 색 번짐, 종이 질감이 느껴지는 화면
- 빛은 항상 부드럽고 따뜻하게 (golden hour, soft diffused light)
- 3D/CGI/디지털 느낌 절대 금지

## 영상 구조 (5장면 × 4초)

[장면1: 세계관 World] — 동화책 첫 페이지를 펼치는 느낌
- 순수 비주얼만. 텍스트 없음
- 책의 배경이 되는 세계를 수채화풍으로 보여줌
- 카메라: slow push-in (동화책 페이지를 들여다보는 느낌)
- 인물 없음, 풍경/배경만

[장면2: 주인공 Character] — 이야기의 주인공 등장
- 주인공의 실루엣 또는 먼 모습이 등장
- 핵심: 화면 하단 1/3 비워둘 것 ("bottom third of frame kept clean for info text")
- 주인공과 세계관의 관계가 드러나는 구도
- 카메라: 약간 다이나믹, 실루엣/뒷모습

[장면3: 줄거리 Story] — 이 책이 어떤 이야기인지
- 핵심 사건/상황을 암시하는 비주얼
- 핵심: 화면 중앙을 비워둘 것 ("center of frame kept clean for text overlay")
- 색감 약간 변화, 긴장감
- 카메라: 가장 다이나믹 (줌, 틸트, 패닝)

[장면4: 메시지 Message] — 이 책의 감정/여운
- 감정적이고 따뜻한 비주얼
- 핵심: 화면 중앙을 비워둘 것 ("center of frame kept clean for text overlay")
- 빛이 따뜻해지고 golden hour 분위기
- 카메라: 부드럽고 몽환적, 보케(bokeh), 빛 입자

[장면5: 타이틀 Title] — 책 정보 마무리
- 가장 밝고 희망적인 순간
- 핵심: 화면 하단 1/3 비워둘 것 ("bottom third of frame kept clean for title card")
- 카메라: pull-back 또는 상승, 빛이 화면을 가득 채움
- 보케 입자가 화면을 감싸며 여운

## 책 정보
- 제목: ${bookFacts.canonicalTitle}
- 저자: ${bookFacts.author}
- 줄거리: ${bookFacts.logline}
- 주인공: ${protagonist ? `${protagonist.name} (${protagonist.personality || '주인공'})` : '정보 없음'}
- 배경: ${bookFacts.setting || '정보 없음'}
- 주제: ${bookFacts.themes?.join(', ') || '정보 없음'}
- 대상: ${bookFacts.targetAudience || '어린이'}

## 스타일 참고
- 화풍: ${styleBible.artDirection.artStyle}
- 색상: ${styleBible.artDirection.paletteKeywords.join(', ')}
- 분위기: ${styleBible.artDirection.lightingMood}
- 카메라: ${styleBible.artDirection.cameraRules?.join(', ') || 'smooth cinematic movements'}

## 추가 생성 항목

1. storyLine (장면3 중앙 오버레이):
   - 줄거리를 소개하는 1~2문장 (50자 이내)
   - 스포일러 없이, 어린이가 "이런 이야기구나" 이해할 수 있게
   - 질문형 금지 ("무슨 일이 벌어질까?" X)
   - 구체적인 내용 설명 필수
   - 좋은 예: "작은 별에서 온 왕자가 지구에서 여우를 만나요"
   - 좋은 예: "감정을 모르던 소년 윤재가 특별한 친구를 만나 마음이 자라요"
   - 나쁜 예: "과연 왕자는 무엇을 찾을까?" (질문형)

2. tagline (장면4 중앙 오버레이):
   - 감성적 메시지 1~2문장 (35자 이내)
   - storyLine과 다른 레이어: 감정/여운/메시지
   - 좋은 예: "소중한 건 눈에 보이지 않아요"
   - 좋은 예: "마음이 자라면 세상이 달라 보여요"

3. bookMeta:
   - genre: 한 단어 장르 ("판타지", "성장소설", "모험", "동화" 등)
   - ageGroup: 대상 연령 ("초등 3~6학년", "7세 이상" 등)
   - publisher: 출판사 (알면 입력, 모르면 null)

## Sora 프롬프트 규칙 (영어)
- 사람/캐릭터를 직접 묘사하지 말고 환경/분위기/실루엣으로 대체
- 반드시 동화책 질감 키워드: "hand-painted watercolor storybook", "soft edges", "warm golden tones"
- 반드시 빛 묘사: "golden hour glow", "soft diffused light", "gentle bokeh"
- 절대 금지: "3D", "CGI", "rendered", "digital", "photorealistic"
- "(no text)" 또는 "no text on screen" 포함
- 각 프롬프트 350자 이내

## 응답 형식 (JSON)
{
  "storyLine": "줄거리 소개 50자 이내. 질문형 금지, 구체적 설명.",
  "tagline": {
    "text": "감성 태그라인 35자 이내",
    "emotion": "타겟 감정"
  },
  "bookMeta": {
    "genre": "장르 한 단어",
    "ageGroup": "대상 연령",
    "publisher": "출판사 또는 null"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "role": "world",
      "visualDescription": "한국어 시각 설명",
      "videoPrompt": "영어 Sora 프롬프트 350자 이내. hand-painted watercolor storybook + warm golden tones. No text, no characters. 3D 금지.",
      "keyframePrompt": "영어 정지 이미지 프롬프트"
    },
    {
      "sceneNumber": 2,
      "role": "character",
      "visualDescription": "한국어 시각 설명",
      "videoPrompt": "영어 Sora 프롬프트. bottom third clean. 실루엣/먼거리 캐릭터. 3D 금지.",
      "keyframePrompt": "영어 정지 이미지 프롬프트"
    },
    {
      "sceneNumber": 3,
      "role": "story",
      "visualDescription": "한국어 시각 설명",
      "videoPrompt": "영어 Sora 프롬프트. center of frame clean. 가장 다이나믹. 3D 금지.",
      "keyframePrompt": "영어 정지 이미지 프롬프트"
    },
    {
      "sceneNumber": 4,
      "role": "message",
      "visualDescription": "한국어 시각 설명",
      "videoPrompt": "영어 Sora 프롬프트. center of frame clean. golden hour, bokeh. 3D 금지.",
      "keyframePrompt": "영어 정지 이미지 프롬프트"
    },
    {
      "sceneNumber": 5,
      "role": "title",
      "visualDescription": "한국어 시각 설명",
      "videoPrompt": "영어 Sora 프롬프트. bottom third clean. 가장 밝고 따뜻한. 3D 금지.",
      "keyframePrompt": "영어 정지 이미지 프롬프트"
    }
  ]
}

JSON만 반환하세요:`;
}
