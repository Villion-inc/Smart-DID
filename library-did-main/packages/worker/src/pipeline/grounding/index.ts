/**
 * Book Grounding Module
 * Exports all grounding functions for the V2 pipeline
 */

export { fetchCandidates, fetchBookById } from './fetchCandidates';
export { rankCandidates, selectBestCandidate } from './rankCandidates';
export { buildBookFacts } from './buildBookFacts';

import { BookCandidate, BookFacts } from '../../shared/types';
import { fetchCandidates } from './fetchCandidates';
import { selectBestCandidate } from './rankCandidates';
import { buildBookFacts } from './buildBookFacts';

/**
 * Well-known books fallback data for when API is unavailable
 */
const FALLBACK_BOOKS: Record<string, { candidate: BookCandidate; bookFacts: BookFacts }> = {
  '어린왕자': {
    candidate: {
      id: 'fallback-little-prince-ko',
      title: '어린 왕자',
      authors: ['앙투안 드 생텍쥐페리'],
      publishedDate: '1943',
      description: '사막에 불시착한 비행사가 작은 별에서 온 어린 왕자를 만나 그의 여행 이야기를 듣는다. 어린 왕자는 자신의 별에 있는 장미꽃을 떠나 여러 별을 여행하며 다양한 어른들을 만나고, 마침내 지구에 도착해 여우와 친구가 되어 "길들임"의 의미와 "눈에 보이지 않는 것의 소중함"을 배운다.',
      categories: ['Fiction', 'Children\'s Literature', 'Fantasy'],
      language: 'ko',
      averageRating: 4.5,
      ratingsCount: 10000,
    },
    bookFacts: {
      canonicalTitle: '어린 왕자',
      author: '앙투안 드 생텍쥐페리',
      logline: '사막에 불시착한 조종사가 작은 별에서 온 신비로운 소년을 만나요. 어린 왕자는 자신의 별에 있는 장미꽃을 떠나 여러 별을 여행하며, 진정한 우정과 사랑의 의미를 찾아가는 감동적인 여정을 떠나요.',
      mainCharacters: [
        {
          name: '어린 왕자',
          role: 'protagonist',
          appearance: 'Young boy with curly golden blonde hair, bright blue eyes, rosy cheeks, wearing a light blue princely outfit with a flowing golden-yellow scarf, brown boots, innocent and curious expression',
          personality: '순수하고 호기심 많은 소년, 진실된 것을 볼 수 있는 눈을 가짐',
        },
        {
          name: '조종사',
          role: 'supporting',
          appearance: 'Adult man with brown hair, wearing a brown leather aviator jacket and goggles, gentle expression',
          personality: '어른이 되었지만 아이의 마음을 간직한 화자',
        },
        {
          name: '여우',
          role: 'supporting',
          appearance: 'Small orange fox with fluffy tail, warm brown eyes, friendly demeanor',
          personality: '지혜롭고 따뜻한 친구, 길들임의 의미를 가르쳐줌',
        },
      ],
      plotBeats: [
        { order: 1, abstractEvent: '신비로운 만남', emotionalTone: '호기심과 경이로움' },
        { order: 2, abstractEvent: '별들의 여행과 깨달음', emotionalTone: '성찰과 배움' },
        { order: 3, abstractEvent: '진정한 우정의 발견', emotionalTone: '따뜻함과 감동' },
      ],
      setting: '사막과 우주의 작은 별들',
      themes: ['우정', '사랑', '순수함', '본질의 소중함'],
      targetAudience: '전 연령 (어린이부터 어른까지)',
      sourceConfidence: 0.95,
      sourceBookId: 'fallback-little-prince-ko',
    },
  },
  'the little prince': {
    candidate: {
      id: 'fallback-little-prince-en',
      title: 'The Little Prince',
      authors: ['Antoine de Saint-Exupéry'],
      publishedDate: '1943',
      description: 'A pilot stranded in the desert meets a young prince who has traveled from a tiny asteroid. The prince shares stories of his journey through the universe and the lessons he learned about love, loss, and what truly matters in life.',
      categories: ['Fiction', 'Children\'s Literature', 'Fantasy'],
      language: 'en',
      averageRating: 4.5,
      ratingsCount: 10000,
    },
    bookFacts: {
      canonicalTitle: 'The Little Prince',
      author: 'Antoine de Saint-Exupéry',
      logline: 'A pilot crash-lands in the Sahara desert and meets a mysterious young prince from a tiny asteroid. Through their conversations, the prince shares his journey across the universe and the profound lessons about love and friendship.',
      mainCharacters: [
        {
          name: 'The Little Prince',
          role: 'protagonist',
          appearance: 'Young boy with curly golden blonde hair, bright blue eyes, rosy cheeks, wearing a light blue princely outfit with a flowing golden-yellow scarf, brown boots, innocent and curious expression',
          personality: 'Pure and curious boy who can see what is truly important',
        },
      ],
      plotBeats: [
        { order: 1, abstractEvent: 'A mysterious encounter', emotionalTone: 'Wonder and curiosity' },
        { order: 2, abstractEvent: 'Journey through the stars', emotionalTone: 'Reflection and learning' },
        { order: 3, abstractEvent: 'Discovery of true friendship', emotionalTone: 'Warmth and emotion' },
      ],
      setting: 'The Sahara desert and tiny asteroids in space',
      themes: ['Friendship', 'Love', 'Innocence', 'Essential truths'],
      targetAudience: 'All ages',
      sourceConfidence: 0.95,
      sourceBookId: 'fallback-little-prince-en',
    },
  },
};

/**
 * Complete grounding process: search → rank → extract facts
 * Falls back to known books if API is unavailable
 * @param title Book title to search
 * @param author Optional author name
 * @returns BookFacts or null if book not found
 */
export async function groundBook(
  title: string,
  author?: string
): Promise<{ bookFacts: BookFacts; candidate: BookCandidate } | null> {
  console.log('\n[Grounding] === Book Grounding Process ===');
  console.log(`[Grounding] Title: "${title}"${author ? ` by ${author}` : ''}`);

  try {
    // Step 1: Fetch candidates
    const candidates = await fetchCandidates(title, author);

    if (candidates.length === 0) {
      console.log('[Grounding] No API candidates found, checking fallback...');
      return tryFallback(title, author);
    }

    // Step 2: Select best candidate
    const bestCandidate = selectBestCandidate(candidates, title, {
      preferredAuthor: author,
      preferredLanguage: 'ko',
      targetAudience: 'children',
    });

    if (!bestCandidate) {
      console.log('[Grounding] Could not select candidate, checking fallback...');
      return tryFallback(title, author);
    }

    // Step 3: Build book facts
    const bookFacts = await buildBookFacts(bestCandidate);

    console.log('[Grounding] ✅ Book grounding complete\n');

    return {
      bookFacts,
      candidate: bestCandidate,
    };
  } catch (error: any) {
    console.log(`[Grounding] API error: ${error.message}`);
    console.log('[Grounding] Checking fallback data...');
    return tryFallback(title, author);
  }
}

/**
 * Try to find book in fallback data, or build minimal BookFacts from title+author (MVP: API 실패 시에도 파이프라인 진행)
 */
function tryFallback(
  title: string,
  author?: string
): { bookFacts: BookFacts; candidate: BookCandidate } | null {
  const normalizedTitle = title.toLowerCase().trim();

  // Direct match
  if (FALLBACK_BOOKS[normalizedTitle]) {
    console.log('[Grounding] ✅ Using fallback data for known book');
    return FALLBACK_BOOKS[normalizedTitle];
  }

  // Partial match
  for (const [key, data] of Object.entries(FALLBACK_BOOKS)) {
    if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
      console.log('[Grounding] ✅ Using fallback data (partial match)');
      return data;
    }
  }

  // API 실패/미매칭 시 제목+저자만으로 최소 BookFacts 생성 (Mock 도서·429 등에서 파이프라인 계속 진행)
  console.log('[Grounding] ✅ Using minimal book facts (title + author)');
  return buildMinimalBookFacts(title, author);
}

/**
 * Build minimal BookFacts when Google Books API is unavailable or rate-limited.
 * Style Bible / Scene Planning 등이 이어서 동작할 수 있는 최소 필드만 채움.
 */
function buildMinimalBookFacts(
  title: string,
  author?: string
): { bookFacts: BookFacts; candidate: BookCandidate } {
  const authorName = author?.trim() || '알 수 없음';
  const candidate: BookCandidate = {
    id: `minimal-${encodeURIComponent(title)}`,
    title: title.trim(),
    authors: [authorName],
    description: `${title}에 대한 도서입니다.`,
    language: 'ko',
  };
  const bookFacts: BookFacts = {
    canonicalTitle: title.trim(),
    author: authorName,
    logline: `${title}를 소개하는 영상입니다.`,
    mainCharacters: [
      {
        name: '주인공',
        role: 'protagonist',
        appearance: 'Child-friendly character, warm and engaging',
        personality: '친근하고 호기심 많은',
      },
    ],
    plotBeats: [
      { order: 1, abstractEvent: '도입', emotionalTone: '호기심' },
      { order: 2, abstractEvent: '전개', emotionalTone: '몰입' },
      { order: 3, abstractEvent: '마무리', emotionalTone: '여운' },
    ],
    setting: '책의 세계',
    themes: ['독서', '상상력'],
    targetAudience: '어린이·가족',
    sourceConfidence: 0.5,
    sourceBookId: candidate.id,
  };
  return { bookFacts, candidate };
}
