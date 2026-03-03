import http from 'http';
import { createWorker } from './worker';
import { logger } from './config/logger';
import { config } from './config';

// Cloud Run 헬스체크용 HTTP 서버
// 로컬에서는 WORKER_PORT 사용, Cloud Run에서는 PORT 사용
const PORT = process.env.WORKER_PORT || process.env.PORT || 8080;
let isHealthy = false;

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    if (isHealthy) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'starting' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

async function main() {
  logger.info('Starting video generation worker...');
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Database: ${config.databaseUrl ? 'configured' : 'NOT SET'}`);
  logger.info(`Concurrency: ${config.worker.concurrency}`);
  logger.info(`GEMINI_API_KEY: ${config.geminiApiKey ? 'set' : 'NOT SET'}`);
  logger.info(`OPENAI_API_KEY (Sora): ${config.openaiApiKey ? 'set' : 'NOT SET'}`);
  logger.info(`VEO_API_KEY: ${config.veo?.apiKey ? 'set' : 'not set'}`);

  // 헬스체크 서버 시작 (Cloud Run용)
  healthServer.listen(PORT, () => {
    logger.info(`Health check server listening on port ${PORT}`);
  });

  const worker = await createWorker();
  isHealthy = true;

  logger.info('Worker started successfully');

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    isHealthy = false;
    healthServer.close();
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    isHealthy = false;
    healthServer.close();
    await worker.close();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});
