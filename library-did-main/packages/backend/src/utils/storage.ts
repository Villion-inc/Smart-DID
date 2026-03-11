/**
 * DB에 저장된 비디오 경로를 공개 URL로 변환.
 * 항상 백엔드 프록시 경로(/api/videos/)를 사용.
 * (GCS 버킷이 조직 정책으로 공개 불가하므로 직접 URL 사용 불가)
 */
export function toPublicVideoUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;

  // 파일명 추출
  const filename = videoUrl
    .replace(/^https:\/\/storage\.googleapis\.com\/[^/]+\//, '') // GCS 절대 URL에서 파일명 추출
    .replace(/^\/api\/videos\//, '')
    .replace(/^\/videos\//, '')
    .replace(/^\.\//, '')
    .split('/').pop();

  if (!filename) return null;

  // 항상 백엔드 프록시 경로 사용
  return `/api/videos/${filename}`;
}

/**
 * 자막 URL도 동일하게 변환
 */
export function toPublicSubtitleUrl(subtitleUrl: string | null | undefined): string | null {
  return toPublicVideoUrl(subtitleUrl);
}
