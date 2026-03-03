import { config } from '../config';

/**
 * 로컬 비디오 URL을 GCS URL로 변환
 * - STORAGE_TYPE=gcs 일 때만 변환
 * - 이미 https:// URL이면 그대로 반환
 */
export function toPublicVideoUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  
  // 이미 절대 URL이면 그대로 반환
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    return videoUrl;
  }
  
  // GCS 스토리지 사용 시 변환
  if (config.storage.type === 'gcs' && config.storage.gcsBucket) {
    // /api/videos/filename.mp4 또는 /videos/filename.mp4 형식에서 파일명 추출
    const filename = videoUrl
      .replace(/^\/api\/videos\//, '')
      .replace(/^\/videos\//, '')
      .replace(/^\.\//, '');
    
    return `https://storage.googleapis.com/${config.storage.gcsBucket}/${filename}`;
  }
  
  // 로컬 스토리지: 그대로 반환 (백엔드가 서빙)
  return videoUrl;
}

/**
 * 자막 URL도 동일하게 변환
 */
export function toPublicSubtitleUrl(subtitleUrl: string | null | undefined): string | null {
  return toPublicVideoUrl(subtitleUrl);
}
