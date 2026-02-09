import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api',

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    path: process.env.STORAGE_PATH || './storage/videos',
  },

  veo: {
    apiKey: process.env.VEO_API_KEY || '',
    apiEndpoint: process.env.VEO_API_ENDPOINT || 'https://api.veo.example.com/v1',
  },

  video: {
    defaultExpiryDays: parseInt(process.env.VIDEO_DEFAULT_EXPIRY_DAYS || '90', 10),
    maxRetries: parseInt(process.env.VIDEO_MAX_RETRIES || '3', 10),
    sceneDuration: parseInt(process.env.VIDEO_SCENE_DURATION || '8', 10),
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },

  alpas: {
    apiUrl: process.env.ALPAS_API_URL || '',
    apiKey: process.env.ALPAS_API_KEY || '',
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin1234',
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  /** Worker 콜백용 (비공개 API) */
  internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || 'internal-secret',
};
