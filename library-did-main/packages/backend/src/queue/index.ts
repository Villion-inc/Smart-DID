import { Queue } from 'bullmq';
import { config } from '../config';

let _videoQueue: Queue | null = null;

export function getVideoQueue(): Queue | null {
  if (!config.redis.host) {
    console.warn('[Queue] Redis not configured, queue disabled');
    return null;
  }
  
  if (!_videoQueue) {
    try {
      _videoQueue = new Queue('video-generation', {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password || undefined,
        },
      });
      console.log('[Queue] Video queue initialized');
    } catch (error) {
      console.error('[Queue] Failed to initialize queue:', error);
      return null;
    }
  }
  
  return _videoQueue;
}

// Legacy export for backward compatibility
export const videoQueue = {
  add: async (name: string, data: any, opts?: any) => {
    const queue = getVideoQueue();
    if (!queue) {
      console.warn('[Queue] Queue not available, skipping job:', name);
      return null;
    }
    return queue.add(name, data, opts);
  },
  getJobs: async (types: string[]) => {
    const queue = getVideoQueue();
    if (!queue) return [];
    return queue.getJobs(types as any);
  },
  getJobCounts: async () => {
    const queue = getVideoQueue();
    if (!queue) return { waiting: 0, active: 0, completed: 0, failed: 0 };
    return queue.getJobCounts();
  },
  obliterate: async (opts?: any) => {
    const queue = getVideoQueue();
    if (!queue) return;
    return queue.obliterate(opts);
  },
};
