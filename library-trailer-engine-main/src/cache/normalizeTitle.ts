/**
 * Title Normalization for Cache Keys
 * Creates consistent cache keys from book titles
 */

import crypto from 'crypto';

export class TitleNormalizer {
  /**
   * Normalize title for cache key generation
   * - Trim whitespace
   * - Convert to lowercase
   * - Remove special characters (keep Korean, English, numbers, spaces)
   */
  static normalize(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '') // Keep Korean, alphanumeric, spaces
      .replace(/\s+/g, ' '); // Normalize spaces
  }

  /**
   * Generate cache key from title
   * Uses SHA256 hash of normalized title
   */
  static generateCacheKey(title: string, author?: string): string {
    const normalizedTitle = this.normalize(title);
    const normalizedAuthor = author ? this.normalize(author) : '';

    const input = author ? `${normalizedTitle}::${normalizedAuthor}` : normalizedTitle;

    return crypto
      .createHash('sha256')
      .update(input, 'utf8')
      .digest('hex');
  }

  /**
   * Check if two titles match (normalized comparison)
   */
  static titlesMatch(title1: string, title2: string): boolean {
    return this.normalize(title1) === this.normalize(title2);
  }

  /**
   * Extract key terms from title for search
   */
  static extractKeyTerms(title: string): string[] {
    const normalized = this.normalize(title);

    // Split by spaces, filter short words
    return normalized
      .split(' ')
      .filter(word => word.length >= 2) // Skip single characters
      .slice(0, 5); // Keep top 5 terms
  }

  /**
   * Generate short hash for display (first 8 characters)
   */
  static generateShortHash(title: string): string {
    return this.generateCacheKey(title).substring(0, 8);
  }
}
