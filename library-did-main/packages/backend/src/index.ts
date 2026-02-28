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
    // Register plugins
    await fastify.register(cors, {
      origin: true,
      credentials: true,
    });

    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    // Rate Limiting - DDoS 및 스크래핑 방지
    await fastify.register(rateLimit, {
      max: 100, // IP당 1분에 최대 100회 요청
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

    // Swagger documentation
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

    // Register routes
    await fastify.register(healthRoutes, { prefix: config.apiPrefix });
    await fastify.register(authRoutes, { prefix: config.apiPrefix });
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
    fastify.log.info(`API Documentation: http://localhost:${config.port}/documentation`);

    // Start scheduler for periodic tasks (cache cleanup, etc.)
    schedulerService.start();
    fastify.log.info('Scheduler service started');
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
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

main();
