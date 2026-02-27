/**
 * Build Book Facts from verified book candidate
 * Step 0.3 of the V2 Pipeline
 *
 * Uses Gemini to extract structured information from book descriptions
 * with strict anti-hallucination rules
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { BookCandidate, BookFacts, BookCharacter, PlotBeat } from '../../shared/types';

/**
 * Build verified book facts from a book candidate using AI extraction
 * @param candidate Verified book candidate from Google Books
 * @returns Structured book facts for trailer generation
 */
export async function buildBookFacts(candidate: BookCandidate): Promise<BookFacts> {
  console.log(`[Grounding] Building book facts for: "${candidate.title}"`);

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = buildExtractionPrompt(candidate);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3, // Low temperature for factual extraction
        maxOutputTokens: 2000,
      },
    });

    const response = await result.response;
    let text = response.text();

    // Clean up JSON response
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const extracted = JSON.parse(text) as ExtractedBookInfo;

    // Build BookFacts with validation
    const bookFacts: BookFacts = {
      canonicalTitle: candidate.title,
      author: candidate.authors.join(', '),
      logline: extracted.logline || generateDefaultLogline(candidate),
      mainCharacters: validateCharacters(extracted.mainCharacters),
      plotBeats: validatePlotBeats(extracted.plotBeats),
      setting: extracted.setting,
      themes: extracted.themes,
      targetAudience: detectTargetAudience(candidate),
      sourceConfidence: calculateConfidence(candidate, extracted),
      sourceBookId: candidate.id,
    };

    console.log(`[Grounding] ✅ Book facts extracted (confidence: ${(bookFacts.sourceConfidence * 100).toFixed(0)}%)`);
    console.log(`[Grounding]   - Logline: ${bookFacts.logline.substring(0, 50)}...`);
    console.log(`[Grounding]   - Characters: ${bookFacts.mainCharacters.length}`);
    console.log(`[Grounding]   - Plot beats: ${bookFacts.plotBeats.length}`);

    return bookFacts;
  } catch (error: any) {
    console.error(`[Grounding] Error extracting book facts: ${error.message}`);

    // Return minimal facts from candidate data
    return buildMinimalFacts(candidate);
  }
}

interface ExtractedBookInfo {
  logline: string;
  mainCharacters: BookCharacter[];
  plotBeats: PlotBeat[];
  setting?: string;
  themes?: string[];
}

/**
 * Build the extraction prompt with anti-hallucination rules
 */
function buildExtractionPrompt(candidate: BookCandidate): string {
  return `당신은 도서 정보 추출 전문가입니다. 아래 책 정보를 기반으로 구조화된 정보를 추출하세요.

## 책 정보
- 제목: ${candidate.title}
- 저자: ${candidate.authors.join(', ')}
- 설명: ${candidate.description || '설명 없음'}
- 카테고리: ${candidate.categories?.join(', ') || '없음'}
- 출판일: ${candidate.publishedDate || '알 수 없음'}

## 추출 규칙 (매우 중요!)
1. **추측 금지**: 주어진 정보에 없는 내용을 만들어내지 마세요
2. **스포일러 방지**: 결말이나 반전을 직접 언급하지 마세요
3. **추상화**: 구체적 사건을 감정/분위기 중심으로 설명하세요
4. **언어**: 한국어로 작성하세요

## 스포일러 방지 예시
❌ "어린왕자가 뱀에게 물려 죽음"
✅ "어린왕자가 고향으로 돌아가는 특별한 방법을 찾음"

❌ "범인이 집사로 밝혀짐"
✅ "예상치 못한 진실이 밝혀짐"

## 출력 형식 (JSON)
{
  "logline": "2-3문장의 줄거리 요약 (스포일러 없이)",
  "mainCharacters": [
    {
      "name": "캐릭터 이름",
      "role": "protagonist" | "antagonist" | "supporting",
      "appearance": "외형 설명 (영어, 이미지 생성용)",
      "personality": "성격 설명 (한국어)"
    }
  ],
  "plotBeats": [
    {
      "order": 1,
      "abstractEvent": "추상화된 사건 (예: '낯선 만남')",
      "emotionalTone": "감정 톤 (예: '호기심', '긴장감', '따뜻함')"
    }
  ],
  "setting": "배경 설명 (시대, 장소)",
  "themes": ["주제1", "주제2"]
}

## 주의사항
- mainCharacters: 최소 1명, 최대 5명
- plotBeats: 정확히 3개 (시작, 전개, 절정/결말암시)
- 정보가 부족하면 해당 필드를 비워두거나 "알 수 없음"으로 표시

JSON만 반환하세요:`;
}

/**
 * Validate extracted characters
 */
function validateCharacters(characters?: BookCharacter[]): BookCharacter[] {
  if (!characters || characters.length === 0) {
    return [
      {
        name: '주인공',
        role: 'protagonist',
        appearance: 'Main character with distinctive features',
        personality: '이야기의 중심 인물',
      },
    ];
  }

  return characters.slice(0, 5).map((char) => ({
    name: char.name || '이름 없음',
    role: char.role || 'supporting',
    appearance: char.appearance || 'Character with neutral appearance',
    personality: char.personality,
  }));
}

/**
 * Validate extracted plot beats
 */
function validatePlotBeats(plotBeats?: PlotBeat[]): PlotBeat[] {
  const defaultBeats: PlotBeat[] = [
    { order: 1, abstractEvent: '이야기의 시작', emotionalTone: '호기심' },
    { order: 2, abstractEvent: '도전과 성장', emotionalTone: '긴장감' },
    { order: 3, abstractEvent: '의미있는 결말', emotionalTone: '감동' },
  ];

  if (!plotBeats || plotBeats.length === 0) {
    return defaultBeats;
  }

  // Ensure exactly 3 plot beats
  if (plotBeats.length < 3) {
    return [
      ...plotBeats,
      ...defaultBeats.slice(plotBeats.length),
    ];
  }

  return plotBeats.slice(0, 3).map((beat, index) => ({
    order: index + 1,
    abstractEvent: beat.abstractEvent || defaultBeats[index].abstractEvent,
    emotionalTone: beat.emotionalTone || defaultBeats[index].emotionalTone,
  }));
}

/**
 * Generate default logline when extraction fails
 */
function generateDefaultLogline(candidate: BookCandidate): string {
  if (candidate.description) {
    // Use first 100 characters of description as fallback
    const cleaned = candidate.description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 100);
    return cleaned + '...';
  }

  return `${candidate.title}은(는) ${candidate.authors.join(', ')}의 작품입니다.`;
}

/**
 * Detect target audience from categories
 */
function detectTargetAudience(candidate: BookCandidate): string {
  if (!candidate.categories) {
    return '전 연령';
  }

  const categories = candidate.categories.join(' ').toLowerCase();

  if (categories.includes('children') || categories.includes('juvenile') || categories.includes('아동')) {
    return '어린이 (초등학생)';
  }

  if (categories.includes('young adult') || categories.includes('teen') || categories.includes('청소년')) {
    return '청소년';
  }

  if (categories.includes('adult') || categories.includes('성인')) {
    return '성인';
  }

  return '전 연령';
}

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidence(candidate: BookCandidate, extracted: ExtractedBookInfo): number {
  let score = 0.5; // Base score

  // Description quality
  if (candidate.description && candidate.description.length > 100) {
    score += 0.15;
  }

  // Author information
  if (candidate.authors.length > 0 && candidate.authors[0] !== 'Unknown Author') {
    score += 0.1;
  }

  // Extracted content quality
  if (extracted.logline && extracted.logline.length > 20) {
    score += 0.1;
  }

  if (extracted.mainCharacters && extracted.mainCharacters.length > 0) {
    score += 0.1;
  }

  // Ratings indicate verified book
  if (candidate.ratingsCount && candidate.ratingsCount > 10) {
    score += 0.05;
  }

  return Math.min(score, 1);
}

/**
 * Build minimal facts when AI extraction fails
 */
function buildMinimalFacts(candidate: BookCandidate): BookFacts {
  console.log('[Grounding] Using minimal facts (extraction failed)');

  return {
    canonicalTitle: candidate.title,
    author: candidate.authors.join(', '),
    logline: generateDefaultLogline(candidate),
    mainCharacters: [
      {
        name: '주인공',
        role: 'protagonist',
        appearance: 'Main character',
      },
    ],
    plotBeats: [
      { order: 1, abstractEvent: '이야기의 시작', emotionalTone: '호기심' },
      { order: 2, abstractEvent: '도전과 성장', emotionalTone: '긴장감' },
      { order: 3, abstractEvent: '의미있는 결말', emotionalTone: '감동' },
    ],
    targetAudience: detectTargetAudience(candidate),
    sourceConfidence: 0.3, // Low confidence for minimal facts
    sourceBookId: candidate.id,
  };
}
