import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Worker와 동일한 루트 .env 사용 (INTERNAL_API_SECRET 등 일치 필요)
const envPaths = [
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
];
const envPath = envPaths.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
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
    gcsBucket: process.env.GCS_BUCKET || 'smart-did-videos',
    // Worker 저장 경로. 절대경로면 그대로, 아니면 후보 중 존재하는 경로 사용
    path: (() => {
      const raw = process.env.STORAGE_PATH || '';
      if (raw && path.isAbsolute(raw)) return raw;
      const candidates = [
        path.resolve(__dirname, '../../../worker/storage/videos'), // run from backend/src
        path.resolve(__dirname, '../../worker/storage/videos'),    // run from backend/dist
        path.resolve(process.cwd(), '../worker/storage/videos'),   // cwd = packages/backend
        path.resolve(process.cwd(), 'packages/worker/storage/videos'), // cwd = repo root
      ];
      const chosen = candidates.find((p) => fs.existsSync(p));
      return chosen || candidates[0];
    })(),
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
    /** true 또는 1이면 실제 API 대신 Mock 도서(BK001~BK035) 사용 */
    useMock:
      process.env.ALPAS_USE_MOCK === 'true' || process.env.ALPAS_USE_MOCK === '1',
    apiUrl: process.env.ALPAS_API_URL || '',
    apiKey: process.env.ALPAS_API_KEY || '',
    libNo: process.env.ALPAS_LIB_NO || '1',
    manageCode: process.env.ALPAS_MANAGE_CODE || 'MA',
    networkAdapterId: process.env.ALPAS_NETWORK_ADAPTER_ID || '1',
  },

  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin1234',
  },

  logLevel: process.env.LOG_LEVEL || 'warn',

  /** Worker 콜백용 (비공개 API) */
  internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || 'internal-secret',
};
