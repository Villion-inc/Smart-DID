import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// .env 위치: library-did-main/.env (config 기준 ../../../../ = worker/src/config -> library-did-main)
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

  /** trailer-engine 통합 (GEMINI, 비디오/자막 출력) */
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  /** Banana.dev 키프레임 이미지 생성 (trailer-engine과 동일) */
  banana: {
    apiKey: process.env.BANANA_API_KEY || '',
    modelKey: process.env.BANANA_MODEL_KEY || '',
  },
  gemini: {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.GEMINI_TIMEOUT || '120000', 10),
  },

  /** 출력/임시 디렉터리 (trailer-engine 호환) */
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'output'),
  tempDir: process.env.TEMP_DIR || path.join(process.cwd(), 'temp'),

  video: {
    defaultExpiryDays: parseInt(process.env.VIDEO_DEFAULT_EXPIRY_DAYS || '90', 10),
    maxRetries: parseInt(process.env.VIDEO_MAX_RETRIES || '3', 10),
    sceneDuration: parseInt(process.env.VIDEO_SCENE_DURATION || '8', 10),
    totalDuration: parseInt(process.env.VIDEO_TOTAL_DURATION || '24', 10),
    sceneCount: 3,
    format: process.env.VIDEO_FORMAT || 'mp4',
    codec: 'libx264',
    audioCodec: 'aac',
  },

  subtitle: {
    language: process.env.SUBTITLE_LANGUAGE || 'ko',
    format: 'vtt',
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },

  /** Backend 콜백 (영상 생성 완료/실패 시 DB 갱신). Backend와 동일한 .env의 INTERNAL_API_SECRET 사용 */
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || 'internal-secret',
};

export function validateConfig(): void {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
  }
}
