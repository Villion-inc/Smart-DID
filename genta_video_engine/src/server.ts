import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import { config, validateConfig } from './config';
import videoEngineRouter from './routes/video-engine.route';
import { Logger } from './utils/logger';

const logger = new Logger('Server');

/**
 * Express 서버 초기화 및 실행
 */
async function startServer(): Promise<void> {
  try {
    // 설정 검증
    validateConfig();

    // Express 앱 생성
    const app: Application = express();

    // 미들웨어 설정
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CORS 설정 (필요시)
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // 요청 로깅 미들웨어
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    // 정적 파일 제공 (output 디렉토리)
    app.use('/output', express.static(config.outputDir));

    // 라우트 설정
    app.use('/', videoEngineRouter);

    // 404 핸들러
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    });

    // 에러 핸들러
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: config.nodeEnv === 'development' ? err.message : undefined,
      });
    });

    // 서버 시작
    app.listen(config.port, () => {
      logger.info(`🚀 Trailer Engine Server started on port ${config.port}`);
      logger.info(`📁 Output directory: ${config.outputDir}`);
      logger.info(`📁 Temp directory: ${config.tempDir}`);
      logger.info(`🌐 Environment: ${config.nodeEnv}`);
      logger.info(`🎬 Video format: ${config.video.format}`);
      logger.info(`⏱️  Total video duration: ${config.video.totalDuration}s`);
      logger.info('');
      logger.info('Available endpoints:');
      logger.info(`  POST http://localhost:${config.port}/video-engine`);
      logger.info(`  GET  http://localhost:${config.port}/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// 서버 시작
startServer();

// 프로세스 종료 처리
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down server...');
  process.exit(0);
});
