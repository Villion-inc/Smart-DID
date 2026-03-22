/**
 * Scene Planner V2
 * Plans 3 scenes for trailer with consistent visual anchors
 *
 * Scene Structure:
 * - Scene 1 (Hook): Introduce protagonist and conflict
 * - Scene 2 (Journey): Core plot without spoilers
 * - Scene 3 (Promise): Emotional value + CTA
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import {
  BookFacts,
  StyleBible,
  ScenePlan,
  SceneScriptV2,
  SceneNumber,
  SceneType,
} from '../../shared/types';
import { applyStyleToPrompt } from '../style/styleBible';

/**
 * Plan 3 scenes based on book facts and style bible
 */
export async function planScenes(
  bookFacts: BookFacts,
  styleBible: StyleBible
): Promise<ScenePlan[]> {
  console.log(`[Planner] Planning scenes for: "${bookFacts.canonicalTitle}"`);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildPlanningPrompt(bookFacts, styleBible);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
      },
    });

    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const extracted = JSON.parse(text) as { scenes: ScenePlan[] };

    console.log('[Planner] ✅ Scene plans created');
    extracted.scenes.forEach((scene) => {
      console.log(`[Planner]   - Scene ${scene.sceneNumber} (${scene.sceneRole}): ${scene.objective}`);
    });

    return extracted.scenes;
  } catch (error: any) {
    console.error(`[Planner] Error planning scenes: ${error.message}`);
    return buildDefaultScenePlans(bookFacts);
  }
}

/**
 * Generate full scene scripts from plans
 */
export async function generateSceneScripts(
  bookFacts: BookFacts,
  styleBible: StyleBible,
  scenePlans: ScenePlan[]
): Promise<SceneScriptV2[]> {
  console.log('[Planner] Generating full scene scripts...');

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const scripts: SceneScriptV2[] = [];

  for (const plan of scenePlans) {
    const prompt = buildScriptPrompt(bookFacts, styleBible, plan);

    try {
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1500,
        },
      });

      const response = await result.response;
      let text = response.text();

      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const extracted = JSON.parse(text) as Omit<SceneScriptV2, 'sharedAnchors'>;

      // Apply shared anchors
      const script: SceneScriptV2 = {
        ...extracted,
        sceneNumber: plan.sceneNumber as SceneNumber,
        sceneType: getSceneType(plan.sceneNumber as SceneNumber),
        sceneRole: plan.sceneRole,
        duration: 8,
        sharedAnchors: {
          protagonistDesign: styleBible.visualAnchors.protagonistDesign,
          primaryLocation: styleBible.visualAnchors.primaryLocation,
          artStylePrefix: styleBible.artStylePrefix,
        },
        // Enhance prompts with style
        keyframePrompt: applyStyleToPrompt(
          extracted.keyframePrompt,
          styleBible,
          true
        ),
        videoPrompt: applyStyleToPrompt(
          extracted.videoPrompt,
          styleBible,
          true
        ),
      };

      scripts.push(script);
      console.log(`[Planner] ✅ Scene ${plan.sceneNumber} script generated`);
    } catch (error: any) {
      console.error(`[Planner] Error generating script for scene ${plan.sceneNumber}: ${error.message}`);
      scripts.push(buildDefaultScript(plan, styleBible, bookFacts));
    }
  }

  return scripts;
}

/**
 * Build planning prompt for AI
 */
function buildPlanningPrompt(bookFacts: BookFacts, styleBible: StyleBible): string {
  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');

  return `당신은 도서 트레일러 기획 전문가입니다. 다음 책 정보를 바탕으로 24초 트레일러(3개 씬 × 8초)를 기획하세요.

## 책 정보
- 제목: ${bookFacts.canonicalTitle}
- 저자: ${bookFacts.author}
- 줄거리: ${bookFacts.logline}
- 주인공: ${protagonist ? `${protagonist.name} (${protagonist.personality || '주인공'})` : '정보 없음'}
- 줄거리 비트:
${bookFacts.plotBeats.map((beat) => `  ${beat.order}. ${beat.abstractEvent} (${beat.emotionalTone})`).join('\n')}
- 배경: ${bookFacts.setting || '정보 없음'}
- 주제: ${bookFacts.themes?.join(', ') || '정보 없음'}
- 대상: ${bookFacts.targetAudience}

## 씬 구조 (필수)
1. **Scene 1 (Hook)**: 주인공과 갈등/상황 소개 - 시청자의 관심을 끌기
2. **Scene 2 (Journey)**: 핵심 줄거리 - 스포일러 없이 여정 보여주기
3. **Scene 3 (Promise)**: 가치와 감정 + 여운 있는 마무리

## 스포일러 방지 규칙
- 결말이나 반전을 암시하지 마세요
- 구체적 사건 대신 감정/분위기를 강조하세요
- "어떤 일이 일어날까요?" 같은 호기심 유발 표현 사용

## 출력 형식 (JSON)
{
  "scenes": [
    {
      "sceneNumber": 1,
      "sceneRole": "hook",
      "objective": "시청자의 관심을 끄는 구체적 목표 (한국어)",
      "emotionalTone": "감정 톤 (한국어)",
      "visualFocus": "시각적 초점 (한국어)",
      "plotBeatReference": 1
    },
    {
      "sceneNumber": 2,
      "sceneRole": "journey",
      "objective": "...",
      "emotionalTone": "...",
      "visualFocus": "...",
      "plotBeatReference": 2
    },
    {
      "sceneNumber": 3,
      "sceneRole": "promise",
      "objective": "...",
      "emotionalTone": "...",
      "visualFocus": "...",
      "plotBeatReference": 3
    }
  ]
}

JSON만 반환하세요:`;
}

/**
 * Build script generation prompt for a single scene
 */
function buildScriptPrompt(
  bookFacts: BookFacts,
  styleBible: StyleBible,
  plan: ScenePlan
): string {
  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');

  return `당신은 도서 트레일러 시나리오 작가입니다. 다음 정보를 바탕으로 Scene ${plan.sceneNumber}의 상세 스크립트를 작성하세요.

## 책 정보
- 제목: ${bookFacts.canonicalTitle}
- 줄거리: ${bookFacts.logline}
- 주인공: ${protagonist?.name || '주인공'}

## 씬 계획
- 역할: ${plan.sceneRole} (${plan.sceneNumber === 1 ? 'Hook' : plan.sceneNumber === 2 ? 'Journey' : 'Promise'})
- 목표: ${plan.objective}
- 감정: ${plan.emotionalTone}
- 시각적 초점: ${plan.visualFocus}

## 스타일 정보
- 화풍: ${styleBible.artDirection.artStyle}
- 색상: ${styleBible.artDirection.paletteKeywords.join(', ')}
- 분위기: ${styleBible.artDirection.lightingMood}

## 주인공 외형 (반드시 포함)
${styleBible.visualAnchors.protagonistDesign}

## 중요 규칙
1. narration은 자연스러운 한국어 구어체 (해요체)
2. visualDescription과 keyframePrompt, videoPrompt는 영어로 작성
3. 영어 프롬프트에 주인공 외형 설명을 포함하지 않아도 됨 (시스템이 자동 추가)
4. 텍스트/자막이 화면에 나타나지 않도록 프롬프트에 "(no text)" 포함

## 씬별 나레이션 가이드 (2-3문장, 40-60자)
${plan.sceneRole === 'hook' ? `
Scene 1 (Hook):
- 주인공과 배경을 소개하며 호기심을 유발하는 나레이션
- 책의 분위기를 전달하는 서정적인 문장
- 예: "아주 먼 옛날, 작은 별에 어린 왕자가 살았어요. 어느 날 그는 자신의 별을 떠나 긴 여행을 시작했죠."
` : plan.sceneRole === 'journey' ? `
Scene 2 (Journey):
- 주인공의 여정과 만남을 보여주는 나레이션
- 핵심 줄거리를 암시하되 스포일러 없이
- 예: "왕자는 여러 별을 여행하며 다양한 사람들을 만났어요. 하지만 그 누구도 왕자의 마음을 이해해주지 못했죠."
` : `
Scene 3 (Promise):
- 책의 메시지와 여운을 전달하는 나레이션
- 감동적이고 생각하게 만드는 문장
- 예: "세상에서 가장 소중한 것은 눈에 보이지 않아요. 마음으로만 볼 수 있는 거죠. 이제 당신도 이 아름다운 이야기를 만나보세요."
`}

## 출력 형식 (JSON, 영어 필드는 영어로)
{
  "narration": "한국어 나레이션 (서정적이고 풍부하게, 2-3문장, 40-60자)",
  "visualDescription": "What happens visually in this scene (English)",
  "keyframePrompt": "Static image prompt for the key moment (English). Include: character pose, background, mood, lighting. Add (no text)",
  "videoPrompt": "8-second video prompt describing motion and action (English). Include: camera movement, character animation. Add (no text)"
}

JSON만 반환하세요:`;
}

/**
 * Get scene type from scene number
 */
function getSceneType(sceneNumber: SceneNumber): SceneType {
  switch (sceneNumber) {
    case 1:
      return 'intro';
    case 2:
      return 'body';
    case 3:
      return 'outro';
  }
}

/**
 * Build default scene plans when AI fails
 */
function buildDefaultScenePlans(bookFacts: BookFacts): ScenePlan[] {
  return [
    {
      sceneNumber: 1,
      sceneRole: 'hook',
      objective: '주인공과 상황을 소개하여 관심 유발',
      emotionalTone: '호기심',
      visualFocus: '주인공과 배경',
      plotBeatReference: 1,
    },
    {
      sceneNumber: 2,
      sceneRole: 'journey',
      objective: '핵심 줄거리를 스포일러 없이 전달',
      emotionalTone: '기대감',
      visualFocus: '주인공의 여정',
      plotBeatReference: 2,
    },
    {
      sceneNumber: 3,
      sceneRole: 'promise',
      objective: '책의 메시지 전달 및 여운 있는 마무리',
      emotionalTone: '감동',
      visualFocus: '메시지와 CTA',
      plotBeatReference: 3,
    },
  ];
}

/**
 * Build default script when AI fails
 */
function buildDefaultScript(
  plan: ScenePlan,
  styleBible: StyleBible,
  bookFacts: BookFacts
): SceneScriptV2 {
  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');
  const protagonistName = protagonist?.name || '주인공';

  const defaults: Record<string, { narration: string; visual: string; keyframe: string; video: string }> = {
    hook: {
      narration: `아주 먼 곳에서 ${protagonistName}의 이야기가 시작돼요. 평범한 일상에서 특별한 운명이 펼쳐지죠.`,
      visual: 'Introduction of the main character in their world',
      keyframe: 'Main character looking curious, standing in the primary location. Warm lighting, inviting atmosphere. (no text)',
      video: 'Slow camera pan revealing the main character. Character turns to face camera with curious expression. Soft background animation. (no text)',
    },
    journey: {
      narration: `${protagonistName}은 새로운 세상을 발견하게 돼요. 그곳에서 만난 사람들은 모두 저마다의 이야기를 품고 있었죠.`,
      visual: 'The main character on their journey, experiencing the core story',
      keyframe: 'Main character in action, showing determination or wonder. Dynamic pose, engaging background. (no text)',
      video: 'Character walking or moving through scenes. Camera follows alongside. Emotional moments captured. (no text)',
    },
    promise: {
      narration: `세상에서 가장 소중한 것은 눈에 보이지 않아요. 마음으로만 볼 수 있는 거죠. 이 아름다운 이야기를 만나보세요.`,
      visual: 'Emotional conclusion with call to action',
      keyframe: 'Main character in a meaningful moment. Warm, inviting lighting. Hopeful expression. (no text)',
      video: 'Character looking toward horizon or turning to viewer. Slow zoom out revealing beautiful scene. (no text)',
    },
  };

  const def = defaults[plan.sceneRole];

  return {
    sceneNumber: plan.sceneNumber as SceneNumber,
    sceneType: getSceneType(plan.sceneNumber as SceneNumber),
    sceneRole: plan.sceneRole,
    narration: def.narration,
    visualDescription: def.visual,
    keyframePrompt: applyStyleToPrompt(def.keyframe, styleBible, true),
    videoPrompt: applyStyleToPrompt(def.video, styleBible, true),
    duration: 8,
    sharedAnchors: {
      protagonistDesign: styleBible.visualAnchors.protagonistDesign,
      primaryLocation: styleBible.visualAnchors.primaryLocation,
      artStylePrefix: styleBible.artStylePrefix,
    },
  };
}
