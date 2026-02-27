/**
 * 비디오 생성 요청 인터페이스
 */
export interface VideoGenerationRequest {
  bookTitle: string;
  author: string;
  summary: string;
}

/**
 * 비디오 생성 응답 인터페이스
 */
export interface VideoGenerationResponse {
  success: boolean;
  videoPath?: string;
  subtitlePath?: string;
  duration?: number;
  error?: string;
}

/**
 * 씬 정보 인터페이스
 */
export interface Scene {
  sceneNumber: 1 | 2 | 3;
  duration: 8; // 각 씬은 8초
  prompt: string;
  narration: string; // 한국어 나레이션
}

/**
 * Gemini API 응답 인터페이스
 */
export interface GeminiVideoResponse {
  videoData: Buffer | string; // 비디오 데이터 또는 URL
  success: boolean;
  error?: string;
}

/**
 * 자막 엔트리 인터페이스
 */
export interface SubtitleEntry {
  index: number;
  startTime: string; // HH:MM:SS,mmm 형식
  endTime: string;   // HH:MM:SS,mmm 형식
  text: string;      // 한국어 텍스트
}

/**
 * 씬별 프롬프트 페이로드
 */
export interface ScenePromptPayload {
  scene: Scene;
  bookInfo: {
    title: string;
    author: string;
    summary: string;
  };
}

/**
 * 비디오 처리 옵션
 */
export interface VideoProcessingOptions {
  outputDir: string;
  tempDir: string;
  targetDuration: number; // 초 단위
  includeSubtitles: boolean;
}

/**
 * 에러 응답 인터페이스
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}
