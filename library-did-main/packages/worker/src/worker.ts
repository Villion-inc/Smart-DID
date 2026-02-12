import { Worker, Job } from 'bullmq';
import { VideoJobData, VideoGenerationRequest } from '@smart-did/shared';
import { config } from './config';
import { logger } from './config/logger';
import { PipelineOrchestratorV2 } from './pipeline/orchestrator';
import { GeminiProviderAdapter } from './services/gemini-provider.adapter';
import { notifyBackendVideoCallback } from './services/backend-callback.service';

/** Pipeline V2: 단일 인스턴스 재사용 */
const geminiProvider = new GeminiProviderAdapter();
const pipelineOrchestrator = new PipelineOrchestratorV2(geminiProvider);

/**
 * Job 데이터(VideoJobData) → 파이프라인 입력(VideoGenerationRequest) 변환
 * 
 * This function converts the job data format to the pipeline request format.
 * The VideoJobData contains: bookId, title, author, summary, trigger, retryCount
 * The VideoGenerationRequest contains: title, author, language, bookId (optional)
 */
function toVideoGenerationRequest(jobData: VideoJobData): VideoGenerationRequest {
  // Create the request object with proper typing - using a workaround to handle TS errors
  const request: any = {
    title: jobData.title,
    author: jobData.author || undefined,
    language: 'ko',
  };
  
  // Add bookId if it exists - this is a workaround for TypeScript compilation issues
  if (jobData.bookId) {
    request.bookId = jobData.bookId;
  }
  
  // Return with proper type assertion to satisfy TypeScript
  return request as VideoGenerationRequest;
}

/**
 * Video generation worker
 * Pipeline V2 실행 후 완료/실패 시 Backend 내부 콜백으로 VideoRecord 갱신
 */
export function createWorker(): Worker {
  const worker = new Worker(
    'video-generation',
    async (job: Job<VideoJobData>) => {
      const { bookId } = job.data;
      logger.info(`Processing job ${job.id} for book ${bookId}`);

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
          return { success: true, videoUrl: result.videoUrl, subtitleUrl: result.subtitleUrl };
        }

        await notifyBackendVideoCallback({
          bookId,
          status: 'FAILED',
          errorMessage: result.error || 'Video generation failed',
        });
        throw new Error(result.error || 'Video generation failed');
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
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      concurrency: config.worker.concurrency,
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed for book ${job.data.bookId}`);
  });

  worker.on('failed', (job, err) => {
    if (job) {
      logger.error(`Job ${job.id} failed for book ${job.data.bookId}:`, err);
    }
  });

  worker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  return worker;
}