import { Worker, Job } from 'bullmq';
import { VideoJobData, VideoGenerationRequest } from '@smart-did/shared';
import { config } from './config';
import { logger } from './config/logger';
import { PipelineOrchestratorV7 } from './pipeline/orchestrator-v7';
import { notifyBackendVideoCallback } from './services/backend-callback.service';

const QUEUE_NAME = 'video-generation';

/** Pipeline V7: 12s Short Trailer (3×4s Sora + crossfade) */
const pipelineOrchestrator = new PipelineOrchestratorV7();

/**
 * Job 데이터(VideoJobData) → 파이프라인 입력(VideoGenerationRequest) 변환
 */
function toVideoGenerationRequest(jobData: VideoJobData): VideoGenerationRequest {
  const request: any = {
    title: jobData.title,
    author: jobData.author || undefined,
    language: 'ko',
  };

  if (jobData.bookId) {
    request.bookId = jobData.bookId;
  }

  return request as VideoGenerationRequest;
}

/**
 * Video generation worker using BullMQ
 * Pipeline V7 (12s Short Trailer) 실행 후 완료/실패 시 Backend 내부 콜백으로 VideoRecord 갱신
 */
export async function createWorker(): Promise<Worker> {
  const redisHost = process.env.REDIS_HOST;
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  if (!redisHost) {
    throw new Error('REDIS_HOST not configured');
  }

  logger.info(`Connecting to Redis at ${redisHost}:${redisPort}...`);

  const worker = new Worker<VideoJobData>(
    QUEUE_NAME,
    async (job: Job<VideoJobData>) => {
      const { bookId } = job.data;
      logger.info(`Processing job ${job.id} for book ${bookId}`);

      // 작업 시작 시 GENERATING 상태로 업데이트
      await notifyBackendVideoCallback({
        bookId,
        status: 'GENERATING',
      });

      try {
        const request = toVideoGenerationRequest(job.data);
        const result = await pipelineOrchestrator.execute(request);

        if (result.status === 'completed') {
          await notifyBackendVideoCallback({
            bookId,
            status: 'READY',
            videoUrl: result.videoUrl,
            subtitleUrl: result.subtitleUrl,
          });
          logger.info(`Job ${job.id} completed successfully`);
          return { success: true, videoUrl: result.videoUrl };
        } else {
          await notifyBackendVideoCallback({
            bookId,
            status: 'FAILED',
            errorMessage: result.error || 'Video generation failed',
          });
          throw new Error(result.error || 'Video generation failed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await notifyBackendVideoCallback({
          bookId,
          status: 'FAILED',
          errorMessage: message,
        });
        logger.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: {
        host: redisHost,
        port: redisPort,
        password: redisPassword,
      },
      concurrency: config.worker.concurrency,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} has completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} has failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  await worker.waitUntilReady();
  logger.info('BullMQ Worker started successfully');
  logger.info(`Worker registered for queue: ${QUEUE_NAME}`);

  return worker;
}
