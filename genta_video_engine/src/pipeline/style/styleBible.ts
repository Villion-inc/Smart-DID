/**
 * Style Bible Generator
 * Creates consistent art direction and visual anchors for trailer generation
 *
 * Key features:
 * - IP-free style descriptions (no brand names like Pixar, Disney, Ghibli)
 * - Visual anchors for protagonist, location, and symbolic objects
 * - Consistent art style prefix for all prompts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { BookFacts, StyleBible, ArtDirection, VisualAnchors } from '../../shared/types';

// List of forbidden brand names that must not appear in prompts
const FORBIDDEN_BRANDS = [
  'Pixar',
  'Disney',
  'DreamWorks',
  'Ghibli',
  'Studio Ghibli',
  'Marvel',
  'DC',
  'Illumination',
  'Blue Sky',
  'Laika',
  'Sony Animation',
  'Aardman',
  'Nickelodeon',
  'Cartoon Network',
];

/**
 * Build a complete style bible from book facts
 * @param bookFacts Extracted book information
 * @returns StyleBible with art direction and visual anchors
 */
export async function buildStyleBible(bookFacts: BookFacts): Promise<StyleBible> {
  console.log(`[Style] Building style bible for: "${bookFacts.canonicalTitle}"`);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildStylePrompt(bookFacts);

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

    // Clean up JSON response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const extracted = JSON.parse(text) as ExtractedStyle;

    // Sanitize to remove any forbidden brands
    const sanitized = sanitizeStyle(extracted);

    // Build final style bible
    const styleBible: StyleBible = {
      artDirection: {
        artStyle: sanitized.artStyle,
        paletteKeywords: sanitized.paletteKeywords || ['warm', 'inviting', 'colorful'],
        lightingMood: sanitized.lightingMood || 'soft natural lighting',
        cameraRules: sanitized.cameraRules || ['eye-level', 'slow movements', 'shallow depth of field'],
      },
      visualAnchors: {
        protagonistDesign: sanitized.protagonistDesign,
        symbolicObject: sanitized.symbolicObject,
        primaryLocation: sanitized.primaryLocation,
      },
      forbiddenBrands: FORBIDDEN_BRANDS,
      artStylePrefix: buildArtStylePrefix(sanitized),
    };

    console.log('[Style] ✅ Style bible created');
    console.log(`[Style]   - Art style: ${styleBible.artDirection.artStyle.substring(0, 50)}...`);
    console.log(`[Style]   - Palette: ${styleBible.artDirection.paletteKeywords.join(', ')}`);
    console.log(`[Style]   - Protagonist: ${styleBible.visualAnchors.protagonistDesign.substring(0, 40)}...`);

    return styleBible;
  } catch (error: any) {
    console.error(`[Style] Error building style bible: ${error.message}`);
    return buildDefaultStyleBible(bookFacts);
  }
}

interface ExtractedStyle {
  artStyle: string;
  paletteKeywords: string[];
  lightingMood: string;
  cameraRules: string[];
  protagonistDesign: string;
  symbolicObject: string;
  primaryLocation: string;
}

/**
 * Build the style extraction prompt
 */
function buildStylePrompt(bookFacts: BookFacts): string {
  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');

  return `당신은 애니메이션 아트 디렉터입니다. 다음 책 정보를 바탕으로 트레일러 영상의 비주얼 스타일을 설계하세요.

## 책 정보
- 제목: ${bookFacts.canonicalTitle}
- 저자: ${bookFacts.author}
- 줄거리: ${bookFacts.logline}
- 주인공: ${protagonist ? `${protagonist.name} - ${protagonist.appearance}` : '정보 없음'}
- 배경: ${bookFacts.setting || '정보 없음'}
- 주제: ${bookFacts.themes?.join(', ') || '정보 없음'}
- 대상: ${bookFacts.targetAudience}

## 중요 규칙
1. **브랜드 언급 금지**: Pixar, Disney, DreamWorks, Ghibli 등 특정 스튜디오/브랜드를 언급하지 마세요
2. **영어로 작성**: 모든 비주얼 설명은 영어로 작성 (이미지 생성 AI용)
3. **구체적 묘사**: 추상적 표현 대신 구체적인 시각적 특징을 설명

## 브랜드 대신 사용할 표현 예시
❌ "Pixar style"
✅ "3D animation with soft lighting, rounded character designs, warm color palette, expressive eyes"

❌ "Disney animation"
✅ "Classic 2D animation with fluid movements, detailed backgrounds, musical quality"

❌ "Ghibli aesthetic"
✅ "Hand-painted watercolor backgrounds, soft edges, detailed nature elements, contemplative mood"

## 출력 형식 (JSON, 영어로 작성)
{
  "artStyle": "Complete art style description without brand names (50-100 words)",
  "paletteKeywords": ["color1", "color2", "color3", "color4", "color5"],
  "lightingMood": "Lighting description (e.g., 'warm sunset glow', 'soft diffused daylight')",
  "cameraRules": ["camera rule 1", "camera rule 2", "camera rule 3"],
  "protagonistDesign": "Detailed protagonist appearance for consistent rendering (100+ words). Include: hair style/color, eye color, facial features, clothing, distinctive accessories, body proportions, expression style",
  "symbolicObject": "Key object that represents the story's theme (50+ words). Include: size, material, color, condition, emotional significance",
  "primaryLocation": "Main setting/location description (50+ words). Include: architecture, vegetation, atmosphere, time of day, weather"
}

## 대상 연령별 스타일 가이드
${bookFacts.targetAudience?.includes('어린이') ? `
- 밝고 선명한 색상
- 둥글고 친근한 캐릭터 디자인
- 단순하고 읽기 쉬운 배경
- 따뜻하고 안전한 분위기
` : bookFacts.targetAudience?.includes('청소년') ? `
- 역동적이고 세련된 색상
- 더 사실적인 비율의 캐릭터
- 디테일한 배경
- 감정적 깊이가 있는 분위기
` : `
- 세련되고 복잡한 색상 팔레트
- 사실적인 캐릭터 디자인
- 복잡한 배경 요소
- 미묘한 감정 표현
`}

JSON만 반환하세요:`;
}

/**
 * Sanitize extracted style to remove forbidden brands
 */
function sanitizeStyle(style: ExtractedStyle): ExtractedStyle {
  const sanitize = (text: string): string => {
    let sanitized = text;
    for (const brand of FORBIDDEN_BRANDS) {
      const regex = new RegExp(brand, 'gi');
      sanitized = sanitized.replace(regex, '');
    }
    // Clean up any double spaces or awkward phrases
    return sanitized.replace(/\s+/g, ' ').trim();
  };

  return {
    ...style,
    artStyle: sanitize(style.artStyle),
    protagonistDesign: sanitize(style.protagonistDesign),
    symbolicObject: sanitize(style.symbolicObject),
    primaryLocation: sanitize(style.primaryLocation),
  };
}

/**
 * Build the art style prefix for all prompts
 */
function buildArtStylePrefix(style: ExtractedStyle): string {
  const parts = [
    style.artStyle,
    `Color palette: ${style.paletteKeywords.join(', ')}`,
    style.lightingMood,
  ];

  return parts.join('. ') + '.';
}

/**
 * Build default style bible when AI generation fails
 */
function buildDefaultStyleBible(bookFacts: BookFacts): StyleBible {
  console.log('[Style] Using default style bible');

  const protagonist = bookFacts.mainCharacters.find((c) => c.role === 'protagonist');

  return {
    artDirection: {
      artStyle: '3D animation with soft lighting, warm colors, rounded character designs, expressive eyes, child-friendly aesthetic',
      paletteKeywords: ['sky-blue', 'golden-yellow', 'soft-pink', 'warm-white', 'forest-green'],
      lightingMood: 'warm natural daylight with soft shadows',
      cameraRules: ['eye-level perspective', 'slow dolly movements', 'shallow depth of field'],
    },
    visualAnchors: {
      protagonistDesign: protagonist?.appearance || 'Young character with friendly expression, colorful clothing, distinctive accessory',
      symbolicObject: 'A meaningful object that represents the story theme',
      primaryLocation: 'A welcoming environment with warm lighting and natural elements',
    },
    forbiddenBrands: FORBIDDEN_BRANDS,
    artStylePrefix: '3D animation with soft lighting, warm colors, rounded character designs, expressive eyes, child-friendly aesthetic. Color palette: sky-blue, golden-yellow, soft-pink. warm natural daylight with soft shadows.',
  };
}

/**
 * Generate visual anchor images using Imagen
 * @param styleBible Style bible with visual anchors
 * @returns Paths to generated anchor images
 */
export async function generateVisualAnchorImages(
  styleBible: StyleBible
): Promise<{ protagonist?: string; location?: string; object?: string }> {
  // This would integrate with Imagen API to generate reference images
  // For now, returning empty paths - actual implementation would save images
  console.log('[Style] Visual anchor image generation (placeholder)');

  return {
    protagonist: undefined,
    location: undefined,
    object: undefined,
  };
}

/**
 * Apply style bible to a scene prompt
 * @param basePrompt Original scene prompt
 * @param styleBible Style bible to apply
 * @param includeProtagonist Whether to include protagonist design
 * @returns Enhanced prompt with style prefix
 */
export function applyStyleToPrompt(
  basePrompt: string,
  styleBible: StyleBible,
  includeProtagonist: boolean = true
): string {
  const parts: string[] = [styleBible.artStylePrefix];

  if (includeProtagonist) {
    parts.push(styleBible.visualAnchors.protagonistDesign);
  }

  parts.push(basePrompt);

  // Add negative prompt elements
  parts.push('(no text) (no subtitles) (no letters) (no words on screen)');

  // Sanitize final prompt
  let finalPrompt = parts.join(' ');

  // Remove any accidentally included brand names
  for (const brand of styleBible.forbiddenBrands) {
    const regex = new RegExp(brand, 'gi');
    finalPrompt = finalPrompt.replace(regex, '');
  }

  return finalPrompt.replace(/\s+/g, ' ').trim();
}
