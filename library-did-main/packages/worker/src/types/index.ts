/**
 * Worker 전용 타입 (trailer-engine types 복사)
 * 타입 통합(shared 패키지 병합) 후 @smart-did/shared 로 이전 예정
 */

export interface Scene {
  sceneNumber: 1 | 2 | 3;
  duration: 8;
  prompt: string;
  narration: string;
}

export interface ScenePromptPayload {
  scene: Scene;
  bookInfo: {
    title: string;
    author: string;
    summary: string;
  };
}

export interface GeminiVideoResponse {
  videoData: Buffer | string;
  success: boolean;
  error?: string;
}

/** WebVTT/SRT 자막 엔트리 (video-processor, subtitle-generator용) */
export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}
