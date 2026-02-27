import dotenv from 'dotenv';
import path from 'path';

// 환경 변수 로드
dotenv.config();

/**
 * 애플리케이션 설정
 */
export const config = {
  // API 설정
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 디렉토리 설정
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'output'),
  tempDir: process.env.TEMP_DIR || path.join(process.cwd(), 'temp'),

  // 비디오 설정
  video: {
    totalDuration: 24, // 전체 비디오 길이 (초)
    sceneDuration: 8,  // 각 씬 길이 (초)
    sceneCount: 3,     // 씬 개수
    format: 'mp4',
    codec: 'libx264',
    audioCodec: 'aac',
  },

  // 자막 설정
  subtitle: {
    language: 'ko',
    format: 'vtt',
  },

  // Gemini API 설정
  gemini: {
    model: 'gemini-2.0-flash', // Gemini 2.0 Flash 모델
    temperature: 0.7,
    maxRetries: 3,
    timeout: 120000, // 2분
  },
};

/**
 * 설정 유효성 검사
 */
export function validateConfig(): void {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required in environment variables');
  }
}
