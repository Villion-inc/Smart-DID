import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import bookRoutes from './routes/book.routes';
import recommendationRoutes from './routes/recommendation.routes';
import adminRoutes from './routes/admin.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(`${config.apiPrefix}/auth`, authRoutes);
  app.use(`${config.apiPrefix}/books`, bookRoutes);
  app.use(`${config.apiPrefix}/recommendations`, recommendationRoutes);
  app.use(`${config.apiPrefix}/admin`, adminRoutes);

  app.use(errorMiddleware);

  return app;
}
