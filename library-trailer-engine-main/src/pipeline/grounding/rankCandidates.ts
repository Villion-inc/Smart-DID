/**
 * Rank Book Candidates
 * Step 0.2 of the V2 Pipeline
 *
 * Handles disambiguation for:
 * - Same title, different authors (동명이작)
 * - Series vs standalone books
 * - Different editions of the same book
 */

import { BookCandidate, BookCandidateScore } from '../../shared/types';

interface RankingConfig {
  preferredAuthor?: string;
  preferredLanguage?: string;
  targetAudience?: 'children' | 'young_adult' | 'adult';
}

/**
 * Rank book candidates and return the best match
 * @param candidates Array of book candidates
 * @param searchTitle Original search title
 * @param config Ranking configuration
 * @returns Sorted array of candidates with scores
 */
export function rankCandidates(
  candidates: BookCandidate[],
  searchTitle: string,
  config: RankingConfig = {}
): BookCandidateScore[] {
  if (candidates.length === 0) {
    return [];
  }

  console.log(`[Grounding] Ranking ${candidates.length} candidates for: "${searchTitle}"`);

  const scoredCandidates = candidates.map((candidate) => {
    const score = calculateScore(candidate, searchTitle, config);
    return {
      candidate,
      score: score.total,
      matchDetails: {
        titleMatch: score.titleMatch,
        authorMatch: score.authorMatch,
        descriptionQuality: score.descriptionQuality,
        popularity: score.popularity,
      },
    };
  });

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  // Log top 3 candidates
  console.log('[Grounding] Top candidates:');
  scoredCandidates.slice(0, 3).forEach((scored, index) => {
    console.log(
      `   ${index + 1}. "${scored.candidate.title}" by ${scored.candidate.authors.join(', ')} ` +
      `(score: ${scored.score.toFixed(2)})`
    );
  });

  return scoredCandidates;
}

/**
 * Select the best candidate automatically
 * @param candidates Array of book candidates
 * @param searchTitle Original search title
 * @param config Ranking configuration
 * @returns Best matching candidate or null
 */
export function selectBestCandidate(
  candidates: BookCandidate[],
  searchTitle: string,
  config: RankingConfig = {}
): BookCandidate | null {
  const ranked = rankCandidates(candidates, searchTitle, config);

  if (ranked.length === 0) {
    console.log('[Grounding] No candidates to select from');
    return null;
  }

  const best = ranked[0];
  console.log(
    `[Grounding] Selected: "${best.candidate.title}" by ${best.candidate.authors.join(', ')} ` +
    `(confidence: ${(best.score * 100).toFixed(0)}%)`
  );

  return best.candidate;
}

interface ScoreBreakdown {
  titleMatch: number;
  authorMatch: number;
  descriptionQuality: number;
  popularity: number;
  total: number;
}

/**
 * Calculate score for a single candidate
 */
function calculateScore(
  candidate: BookCandidate,
  searchTitle: string,
  config: RankingConfig
): ScoreBreakdown {
  const weights = {
    titleMatch: 0.4,
    authorMatch: 0.2,
    descriptionQuality: 0.25,
    popularity: 0.15,
  };

  // Title match score (0-1)
  const titleMatch = calculateTitleMatch(candidate.title, searchTitle);

  // Author match score (0-1)
  const authorMatch = config.preferredAuthor
    ? calculateAuthorMatch(candidate.authors, config.preferredAuthor)
    : 0.5; // Neutral if no author specified

  // Description quality score (0-1)
  const descriptionQuality = calculateDescriptionQuality(candidate);

  // Popularity score (0-1)
  const popularity = calculatePopularityScore(candidate);

  // Language bonus
  const languageBonus = calculateLanguageBonus(candidate, config.preferredLanguage);

  // Target audience bonus
  const audienceBonus = calculateAudienceBonus(candidate, config.targetAudience);

  const total =
    titleMatch * weights.titleMatch +
    authorMatch * weights.authorMatch +
    descriptionQuality * weights.descriptionQuality +
    popularity * weights.popularity +
    languageBonus * 0.1 +
    audienceBonus * 0.1;

  return {
    titleMatch,
    authorMatch,
    descriptionQuality,
    popularity,
    total: Math.min(total, 1), // Cap at 1
  };
}

/**
 * Calculate title match score using normalized Levenshtein distance
 */
function calculateTitleMatch(candidateTitle: string, searchTitle: string): number {
  const normalizedCandidate = normalizeTitle(candidateTitle);
  const normalizedSearch = normalizeTitle(searchTitle);

  // Exact match
  if (normalizedCandidate === normalizedSearch) {
    return 1;
  }

  // Contains match
  if (normalizedCandidate.includes(normalizedSearch) || normalizedSearch.includes(normalizedCandidate)) {
    return 0.9;
  }

  // Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalizedCandidate, normalizedSearch);
  const maxLength = Math.max(normalizedCandidate.length, normalizedSearch.length);
  const similarity = 1 - distance / maxLength;

  return Math.max(similarity, 0);
}

/**
 * Calculate author match score
 */
function calculateAuthorMatch(authors: string[], preferredAuthor: string): number {
  const normalizedPreferred = normalizeTitle(preferredAuthor);

  for (const author of authors) {
    const normalizedAuthor = normalizeTitle(author);
    if (normalizedAuthor.includes(normalizedPreferred) || normalizedPreferred.includes(normalizedAuthor)) {
      return 1;
    }
  }

  // Fuzzy match
  let bestMatch = 0;
  for (const author of authors) {
    const normalizedAuthor = normalizeTitle(author);
    const distance = levenshteinDistance(normalizedAuthor, normalizedPreferred);
    const maxLength = Math.max(normalizedAuthor.length, normalizedPreferred.length);
    const similarity = 1 - distance / maxLength;
    bestMatch = Math.max(bestMatch, similarity);
  }

  return bestMatch;
}

/**
 * Calculate description quality score
 * Better descriptions help with accurate book fact extraction
 */
function calculateDescriptionQuality(candidate: BookCandidate): number {
  if (!candidate.description) {
    return 0;
  }

  const descLength = candidate.description.length;

  // Very short descriptions are less useful
  if (descLength < 50) {
    return 0.2;
  }

  // Ideal description length: 200-500 characters
  if (descLength >= 200 && descLength <= 500) {
    return 1;
  }

  if (descLength > 50 && descLength < 200) {
    return 0.5 + (descLength - 50) / 300;
  }

  // Very long descriptions are okay but not ideal
  if (descLength > 500) {
    return 0.9;
  }

  return 0.5;
}

/**
 * Calculate popularity score based on ratings
 */
function calculatePopularityScore(candidate: BookCandidate): number {
  if (!candidate.averageRating && !candidate.ratingsCount) {
    return 0.3; // Unknown popularity, slight penalty
  }

  let score = 0;

  // Rating contribution (0-0.5)
  if (candidate.averageRating) {
    score += (candidate.averageRating / 5) * 0.5;
  }

  // Rating count contribution (0-0.5)
  if (candidate.ratingsCount) {
    // Log scale for rating count
    const logCount = Math.log10(candidate.ratingsCount + 1);
    score += Math.min(logCount / 5, 0.5);
  }

  return Math.min(score, 1);
}

/**
 * Calculate language bonus
 */
function calculateLanguageBonus(candidate: BookCandidate, preferredLanguage?: string): number {
  if (!preferredLanguage) {
    return 0;
  }

  if (candidate.language === preferredLanguage) {
    return 0.5;
  }

  return 0;
}

/**
 * Calculate audience bonus based on categories
 */
function calculateAudienceBonus(
  candidate: BookCandidate,
  targetAudience?: 'children' | 'young_adult' | 'adult'
): number {
  if (!targetAudience || !candidate.categories) {
    return 0;
  }

  const categories = candidate.categories.join(' ').toLowerCase();

  switch (targetAudience) {
    case 'children':
      if (categories.includes('children') || categories.includes('juvenile')) {
        return 0.5;
      }
      break;
    case 'young_adult':
      if (categories.includes('young adult') || categories.includes('teen')) {
        return 0.5;
      }
      break;
    case 'adult':
      if (!categories.includes('children') && !categories.includes('juvenile')) {
        return 0.3;
      }
      break;
  }

  return 0;
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '') // Keep alphanumeric and Korean
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
