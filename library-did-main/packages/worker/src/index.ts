import { createWorker } from './worker';
import { logger } from './config/logger';
import { config } from './config';

async function main() {
  logger.info('Starting video generation worker...');
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Redis: ${config.redis.host}:${config.redis.port}`);
  logger.info(`Concurrency: ${config.worker.concurrency}`);

  const worker = createWorker();

  logger.info('Worker started successfully');

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});
