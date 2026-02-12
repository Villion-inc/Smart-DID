import { createWorker } from './worker';
import { logger } from './config/logger';
import { config } from './config';

async function main() {
  logger.info('Starting video generation worker...');
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Redis: ${config.redis.host}:${config.redis.port}`);
  logger.info(`Concurrency: ${config.worker.concurrency}`);
  logger.info(`GEMINI_API_KEY: ${config.geminiApiKey ? 'set' : 'NOT SET'}`);
  logger.info(`OPENAI_API_KEY (Sora): ${config.openaiApiKey ? 'set' : 'NOT SET'}`);
  logger.info(`VEO_API_KEY: ${config.veo?.apiKey ? 'set' : 'not set'}`);

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
