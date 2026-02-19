import { cacheManagerService } from './cache-manager.service';
import { queueService } from './queue.service';

/**
 * Scheduler Service
 * - 주기적인 작업 실행
 * - 캐시 정리, 큐 정리 등
 */
export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * 스케줄러 시작
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting scheduler service');
    this.isRunning = true;

    // 1. 캐시 정리 - 매일 새벽 3시 (또는 6시간마다)
    const cacheCleanupInterval = setInterval(async () => {
      console.log('[Scheduler] Running cache cleanup');
      try {
        const result = await cacheManagerService.cleanupStaleVideos();
        console.log(`[Scheduler] Cache cleanup complete: ${result.deleted} videos deleted`);
      } catch (error) {
        console.error('[Scheduler] Cache cleanup error:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6시간마다

    this.intervals.push(cacheCleanupInterval);

    // 2. 큐 정리 - 매시간
    const queueCleanupInterval = setInterval(async () => {
      console.log('[Scheduler] Running queue cleanup');
      try {
        await queueService.cleanQueue();
        console.log('[Scheduler] Queue cleanup complete');
      } catch (error) {
        console.error('[Scheduler] Queue cleanup error:', error);
      }
    }, 60 * 60 * 1000); // 1시간마다

    this.intervals.push(queueCleanupInterval);

    // 초기 실행 (서버 시작 후 1분 뒤)
    setTimeout(async () => {
      console.log('[Scheduler] Running initial cleanup');
      try {
        await queueService.cleanQueue();
      } catch (error) {
        console.error('[Scheduler] Initial cleanup error:', error);
      }
    }, 60 * 1000);
  }

  /**
   * 스케줄러 종료
   */
  stop() {
    console.log('[Scheduler] Stopping scheduler service');
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;
  }

  /**
   * 즉시 캐시 정리 실행
   */
  async runCacheCleanupNow() {
    console.log('[Scheduler] Running manual cache cleanup');
    return cacheManagerService.cleanupStaleVideos();
  }

  /**
   * 즉시 큐 정리 실행
   */
  async runQueueCleanupNow() {
    console.log('[Scheduler] Running manual queue cleanup');
    return queueService.cleanQueue();
  }
}

export const schedulerService = new SchedulerService();
