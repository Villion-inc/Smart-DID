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

  // PostgreSQL (pg-boss queue)
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis (legacy - kept for compatibility)
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
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  internalApiSecret: process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET || 'internal-secret',

  /** Alpas API (Worker에서 Backend 내부 API를 통해 도서 검색) */
  alpas: {
    /** true이면 Alpas 검색을 1차 소스로 사용 (기본: true) */
    enabled: process.env.ALPAS_ENABLED !== 'false',
  },

  /** 네이버 도서 검색 API (줄거리 설명 PRIMARY source) */
  naver: {
    clientId: process.env.NAVER_CLIENT_ID || '',
    clientSecret: process.env.NAVER_CLIENT_SECRET || '',
  },
};

export const VIDEO_CONFIG_V7 = {
  sceneDuration: 4,
  crossfadeDuration: 0.5,
  crossfadeType: 'dissolve',
  codec: 'libx264',
  format: 'mp4',
  resolution: { width: 1280, height: 720 },
  fps: 30,
  modes: {
    12: {
      sceneCount: 3,
      totalDuration: 11,
      sceneRoles: ['atmosphere', 'story', 'emotion'],
      xfadeOffsets: [3.5, 7.0],
      fadeOutStart: 10.5,
    },
    20: {
      sceneCount: 5,
      totalDuration: 18,
      sceneRoles: ['world', 'character', 'story', 'message', 'title'],
      xfadeOffsets: [3.5, 7.0, 10.5, 14.0],
      fadeOutStart: 17.5,
    },
  },
  fonts: {
    bold: process.platform === 'darwin'
      ? '/System/Library/Fonts/AppleSDGothicNeo.ttc'
      : '/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf',
    medium: process.platform === 'darwin'
      ? '/System/Library/Fonts/AppleSDGothicNeo.ttc'
      : '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
  },
};

export function validateConfig(): void {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
  }
}
