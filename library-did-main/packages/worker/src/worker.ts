import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';
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
 * Video generation worker using pg-boss
 * Pipeline V7 (12s Short Trailer) 실행 후 완료/실패 시 Backend 내부 콜백으로 VideoRecord 갱신
 */
export async function createWorker(): Promise<PgBoss> {
  const dbUrl = config.databaseUrl;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const boss = new PgBoss({
    connectionString: dbUrl,
  });

  boss.on('error', (error: Error) => {
    logger.error('pg-boss error:', error);
  });

  await boss.start();
  logger.info('pg-boss started successfully');

  // Create queue if not exists (pg-boss v10+ requires explicit queue creation)
  await boss.createQueue(QUEUE_NAME);
  logger.info(`Queue ${QUEUE_NAME} created/verified`);

  // Register job handler (pg-boss v10+ passes array of jobs)
  await boss.work<VideoJobData>(
    QUEUE_NAME,
    { localConcurrency: config.worker.concurrency },
    async (jobs: Job<VideoJobData>[]) => {
      for (const job of jobs) {
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
      }
    }
  );

  logger.info(`Worker registered for queue: ${QUEUE_NAME}`);
  return boss;
}
