import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { bookRoutes } from './routes/book.routes';
import { adminRoutes } from './routes/admin.routes';
import { didRoutes } from './routes/did.routes';
import { internalRoutes } from './routes/internal.routes';
import { videoRoutes } from './routes/video.routes';
import prisma from './config/database';
import { schedulerService } from './services/scheduler.service';
import { queueService } from './services/queue.service';
import { initAlpasService } from './services/alpas.service';
import { setupAuditLogging } from './plugins/audit';

const fastify = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

async function main() {
  try {
    // CORS 설정 - 프로덕션에서는 허용된 도메인만
    const allowedOrigins = [
      'https://did-frontend-730268485621.asia-northeast3.run.app',
      'https://smart-did-730268485621.asia-southeast1.run.app',
      'http://34.22.107.18',
      /^http:\/\/localhost(:\d+)?$/,
    ];
    
    await fastify.register(cors, {
      origin: config.nodeEnv === 'production' 
        ? allowedOrigins 
        : true,
      credentials: true,
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: config.nodeEnv === 'production' ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://shopping-phinf.pstatic.net", "https://storage.googleapis.com"],
          mediaSrc: ["'self'", "https://storage.googleapis.com"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      } : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    });

    // Rate Limiting - DDoS 및 스크래핑 방지
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        success: false,
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        statusCode: 429,
      }),
    });

    await fastify.register(jwt, {
      secret: config.jwt.secret,
    });

    // Swagger - 개발 환경에서만 활성화
    if (config.nodeEnv !== 'production') {
      await fastify.register(swagger, {
        swagger: {
          info: {
            title: 'Smart DID Video Service API',
            description: 'API documentation for the Smart DID library video service',
            version: '1.0.0',
          },
          host: `localhost:${config.port}`,
          schemes: ['http'],
          consumes: ['application/json'],
          produces: ['application/json'],
          tags: [
            { name: 'health', description: 'Health check endpoints' },
            { name: 'auth', description: 'Authentication endpoints' },
            { name: 'books', description: 'Book-related endpoints' },
            { name: 'videos', description: 'Video-related endpoints' },
            { name: 'admin', description: 'Admin endpoints' },
            { name: 'did', description: 'Digital Information Display (DID) public endpoints' },
          ],
          securityDefinitions: {
            Bearer: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
              description: 'JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"',
            },
          },
        },
      });

      await fastify.register(swaggerUi, {
        routePrefix: '/documentation',
        uiConfig: {
          docExpansion: 'list',
          deepLinking: false,
        },
      });
    }

    // 감사 로깅 (관리자 작업 기록)
    setupAuditLogging(fastify);

    // Register routes
    await fastify.register(healthRoutes, { prefix: config.apiPrefix });

    // Auth 라우트에 별도 rate limit 적용 (5회/분 — 브루트포스 방지)
    await fastify.register(async (instance) => {
      await instance.register(rateLimit, {
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: () => ({
          success: false,
          error: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.',
          statusCode: 429,
        }),
      });
      await instance.register(authRoutes, { prefix: config.apiPrefix });
    });

    await fastify.register(bookRoutes, { prefix: config.apiPrefix });
    await fastify.register(adminRoutes, { prefix: config.apiPrefix });
    await fastify.register(didRoutes, { prefix: config.apiPrefix });
    await fastify.register(internalRoutes, { prefix: config.apiPrefix });
    await fastify.register(videoRoutes, { prefix: config.apiPrefix });

    // Start server
    await fastify.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    fastify.log.info(`Server running on port ${config.port}`);
    fastify.log.info(`Environment: ${config.nodeEnv}`);
    fastify.log.info(`Video storage path: ${config.storage.path}`);
    if (config.nodeEnv !== 'production') {
      fastify.log.info(`API Documentation: http://localhost:${config.port}/documentation`);
    }

    // ALPAS API 연결 테스트 (시작 시 1회)
    await initAlpasService();

    // Initialize pg-boss queue service
    await queueService.initialize();
    fastify.log.info('Queue service (pg-boss) initialized');

    // Start scheduler for periodic tasks (cache cleanup, etc.)
    schedulerService.start();
    fastify.log.info('Scheduler service started');

    // 백그라운드: 신착도서 표지 캐시 사전 로딩
    import('./controllers/did.controller').then(m => m.warmCoverCache()).catch(() => {});
  } catch (error) {
    fastify.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  schedulerService.stop();
  await queueService.stop();
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

main();
