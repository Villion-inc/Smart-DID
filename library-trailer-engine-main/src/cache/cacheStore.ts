/**
 * Cache Store
 * In-memory cache with TTL support (Redis-backed in production)
 */

import { CacheEntry, VideoGenerationResult } from '../shared/types';
import { TitleNormalizer } from './normalizeTitle';

export class CacheStore {
  private cache: Map<string, CacheEntry>;
  private ttlDays: number;

  constructor(ttlDays: number = 90) {
    this.cache = new Map();
    this.ttlDays = ttlDays;
  }

  /**
   * Check if result is cached
   */
  async has(title: string, author?: string): Promise<boolean> {
    const cacheKey = TitleNormalizer.generateCacheKey(title, author);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Get cached result
   */
  async get(title: string, author?: string): Promise<VideoGenerationResult | null> {
    const cacheKey = TitleNormalizer.generateCacheKey(title, author);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Increment request count
    entry.requestCount++;

    // Return result
    return {
      jobId: entry.jobId,
      status: 'completed',
      videoUrl: entry.videoUrl,
      subtitleUrl: entry.subtitleUrl,
      qcReport: entry.qcReport,
      costReport: entry.costReport,
      cacheHit: true,
      mode: 'parallel', // Original mode
      createdAt: entry.createdAt,
      completedAt: entry.createdAt,
    };
  }

  /**
   * Store result in cache
   */
  async set(
    title: string,
    result: VideoGenerationResult,
    author?: string
  ): Promise<void> {
    const cacheKey = TitleNormalizer.generateCacheKey(title, author);

    const entry: CacheEntry = {
      cacheKey,
      jobId: result.jobId,
      videoUrl: result.videoUrl!,
      subtitleUrl: result.subtitleUrl!,
      qcReport: result.qcReport!,
      costReport: result.costReport!,
      requestCount: 1,
      createdAt: result.createdAt,
      expiresAt: this.calculateExpiryDate(),
    };

    this.cache.set(cacheKey, entry);

    console.log(`[Cache] Stored result for key: ${cacheKey.substring(0, 8)}...`);
    console.log(`[Cache] Expires at: ${entry.expiresAt}`);
  }

  /**
   * Invalidate cache entry
   */
  async delete(title: string, author?: string): Promise<void> {
    const cacheKey = TitleNormalizer.generateCacheKey(title, author);
    this.cache.delete(cacheKey);
    console.log(`[Cache] Deleted entry for key: ${cacheKey.substring(0, 8)}...`);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    console.log('[Cache] Cleared all entries');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalRequests: number;
    averageRequestsPerEntry: number;
  } {
    const totalEntries = this.cache.size;
    const totalRequests = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.requestCount,
      0
    );

    return {
      totalEntries,
      totalRequests,
      averageRequestsPerEntry: totalEntries > 0 ? totalRequests / totalEntries : 0,
    };
  }

  /**
   * Clean expired entries
   */
  async cleanExpired(): Promise<number> {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return new Date(entry.expiresAt) < new Date();
  }

  /**
   * Calculate expiry date
   */
  private calculateExpiryDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + this.ttlDays);
    return now.toISOString();
  }
}

// Singleton instance (in production, use Redis)
export const cacheStore = new CacheStore();
