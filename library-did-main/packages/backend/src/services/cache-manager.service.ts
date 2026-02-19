import { videoRepository } from '../repositories/video.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';

/**
 * Cache Manager Service
 * - LRU (Least Recently Used) 기반 자동 삭제
 * - 잘 안 찾는 책들은 오래된 것부터 삭제
 * - 저장 공간 관리
 */
export class CacheManagerService {
  // 최대 보관할 영상 수 (기본 500개)
  private maxVideos: number;
  // 삭제 대상 선정 기준 (일)
  private staleThresholdDays: number;
  // 저장 경로
  private storagePath: string;

  constructor() {
    this.maxVideos = parseInt(process.env.MAX_CACHED_VIDEOS || '500', 10);
    this.staleThresholdDays = parseInt(process.env.STALE_THRESHOLD_DAYS || '30', 10);
    this.storagePath = config.storage.path;
  }

  /**
   * LRU 기반으로 오래된 영상 삭제
   * - lastRequestedAt 기준으로 가장 오래된 것부터 삭제
   * - requestCount가 낮은 것 우선 삭제
   */
  async cleanupStaleVideos(): Promise<{
    deleted: number;
    freedSpace: number;
    details: Array<{ bookId: string; reason: string }>;
  }> {
    const details: Array<{ bookId: string; reason: string }> = [];
    let deletedCount = 0;
    let freedSpace = 0;

    // 1. 만료된 영상 먼저 삭제
    const expiredVideos = await this.getExpiredVideos();
    for (const video of expiredVideos) {
      const size = await this.deleteVideo(video.bookId);
      freedSpace += size;
      deletedCount++;
      details.push({ bookId: video.bookId, reason: 'expired' });
    }

    // 2. 최대 개수 초과 시 LRU 기반 삭제
    const totalVideos = await videoRepository.countByStatus('READY');
    if (totalVideos > this.maxVideos) {
      const toDelete = totalVideos - this.maxVideos;
      const staleVideos = await this.getStaleVideos(toDelete);

      for (const video of staleVideos) {
        const size = await this.deleteVideo(video.bookId);
        freedSpace += size;
        deletedCount++;
        details.push({ bookId: video.bookId, reason: 'lru_eviction' });
      }
    }

    // 3. 오랫동안 조회되지 않은 영상 삭제 (staleThresholdDays 이상)
    const unusedVideos = await this.getUnusedVideos();
    for (const video of unusedVideos) {
      const size = await this.deleteVideo(video.bookId);
      freedSpace += size;
      deletedCount++;
      details.push({ bookId: video.bookId, reason: 'unused' });
    }

    if (deletedCount > 0) {
      await notificationRepository.create({
        type: 'cache_cleanup',
        message: `캐시 정리 완료: ${deletedCount}개 영상 삭제, ${this.formatBytes(freedSpace)} 확보`,
      });
    }

    console.log(`[CacheManager] Cleanup complete: ${deletedCount} videos deleted, ${this.formatBytes(freedSpace)} freed`);

    return { deleted: deletedCount, freedSpace, details };
  }

  /**
   * 만료된 영상 조회
   */
  private async getExpiredVideos(): Promise<Array<{ bookId: string }>> {
    const now = new Date();
    const videos = await videoRepository.findAll({
      where: {
        status: 'READY',
        expiresAt: { lt: now },
      },
    });
    return videos.map((v) => ({ bookId: v.bookId }));
  }

  /**
   * LRU 기준으로 삭제 대상 영상 조회
   * - lastRequestedAt이 오래된 것
   * - requestCount가 낮은 것
   * - rankingScore가 낮은 것
   */
  private async getStaleVideos(limit: number): Promise<Array<{ bookId: string }>> {
    // rankingScore 기준 오름차순 (낮은 점수 = 인기 없음)
    const videos = await videoRepository.findAll({
      where: { status: 'READY' },
      orderBy: [
        { rankingScore: 'asc' },
        { lastRequestedAt: 'asc' },
        { requestCount: 'asc' },
      ],
      take: limit,
    });
    return videos.map((v) => ({ bookId: v.bookId }));
  }

  /**
   * 일정 기간 조회되지 않은 영상 조회
   */
  private async getUnusedVideos(): Promise<Array<{ bookId: string }>> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - this.staleThresholdDays);

    const videos = await videoRepository.findAll({
      where: {
        status: 'READY',
        lastRequestedAt: { lt: threshold },
        requestCount: { lt: 3 }, // 조회수 3 미만인 것만
      },
    });
    return videos.map((v) => ({ bookId: v.bookId }));
  }

  /**
   * 영상 삭제 (파일 + DB)
   */
  private async deleteVideo(bookId: string): Promise<number> {
    let fileSize = 0;

    try {
      // DB에서 영상 URL 가져오기
      const record = await videoRepository.findByBookId(bookId);
      if (record?.videoUrl) {
        // 로컬 파일인 경우 삭제 (/api/videos/xxx → storagePath/xxx)
        if (record.videoUrl.startsWith('/') || record.videoUrl.startsWith('./')) {
          const filename = record.videoUrl.replace(/^\/api\/videos\//, '').replace(/^\/videos\//, '') || path.basename(record.videoUrl);
          const filePath = path.join(this.storagePath, filename);
          try {
            const stats = await fs.stat(filePath);
            fileSize = stats.size;
            await fs.unlink(filePath);
          } catch (err) {
            // 파일이 없으면 무시
          }
        }
      }

      // DB 상태 업데이트 (NONE으로 변경, 영상 URL 제거)
      await videoRepository.update(bookId, {
        status: 'NONE',
        videoUrl: null,
        rankingScore: 0,
      });

      console.log(`[CacheManager] Deleted video for book ${bookId}`);
    } catch (error) {
      console.error(`[CacheManager] Error deleting video for book ${bookId}:`, error);
    }

    return fileSize;
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<{
    totalVideos: number;
    totalSize: number;
    maxVideos: number;
    usagePercent: number;
    oldestVideo: Date | null;
    newestVideo: Date | null;
  }> {
    const totalVideos = await videoRepository.countByStatus('READY');
    const usagePercent = Math.round((totalVideos / this.maxVideos) * 100);

    // 저장 공간 크기 계산
    let totalSize = 0;
    try {
      totalSize = await this.calculateStorageSize();
    } catch (err) {
      // 무시
    }

    // 가장 오래된/최신 영상 조회
    const oldest = await videoRepository.findAll({
      where: { status: 'READY' },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });

    const newest = await videoRepository.findAll({
      where: { status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return {
      totalVideos,
      totalSize,
      maxVideos: this.maxVideos,
      usagePercent,
      oldestVideo: oldest[0]?.createdAt || null,
      newestVideo: newest[0]?.createdAt || null,
    };
  }

  /**
   * 저장 공간 크기 계산
   */
  private async calculateStorageSize(): Promise<number> {
    let totalSize = 0;

    try {
      const files = await fs.readdir(this.storagePath);
      for (const file of files) {
        const filePath = path.join(this.storagePath, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }
    } catch (err) {
      // 디렉토리가 없으면 0 반환
    }

    return totalSize;
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 특정 영상 조회 시 lastRequestedAt 갱신
   * (영상 조회 API에서 호출)
   */
  async touchVideo(bookId: string): Promise<void> {
    const record = await videoRepository.findByBookId(bookId);
    if (record && record.status === 'READY') {
      await videoRepository.incrementRequestCount(bookId);

      // 랭킹 점수 재계산
      const newScore = this.calculateRankingScore(
        record.requestCount + 1,
        new Date()
      );
      await videoRepository.updateRankingScore(bookId, newScore);
    }
  }

  /**
   * 랭킹 점수 계산
   * - 조회수 + 최근성 가중치
   */
  private calculateRankingScore(requestCount: number, lastRequestedAt: Date): number {
    const now = Date.now();
    const lastRequest = lastRequestedAt.getTime();
    const daysSinceRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);

    // 7일 이내 조회 시 보너스
    let recencyBoost = 0;
    if (daysSinceRequest <= 7) {
      const recencyFactor = 1 - daysSinceRequest / 7;
      recencyBoost = requestCount * 1.5 * recencyFactor;
    }

    return requestCount + recencyBoost;
  }
}

export const cacheManagerService = new CacheManagerService();
