/**
 * DB에 저장된 비디오 경로를 API 프록시 URL로 변환.
 * GCS든 로컬이든 백엔드가 /api/videos/:filename 으로 서빙한다.
 */
export function toPublicVideoUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;

  // 이미 /videos/ 형태면 그대로
  if (videoUrl.startsWith('/videos/')) return videoUrl;

  // /api/videos/... → /videos/... 로 정규화
  if (videoUrl.startsWith('/api/videos/')) {
    return videoUrl.replace('/api/videos/', '/videos/');
  }

  // 레거시 절대 GCS URL → 파일명 추출
  if (videoUrl.startsWith('https://storage.googleapis.com/')) {
    const filename = videoUrl.split('/').pop();
    return filename ? `/videos/${filename}` : null;
  }

  // 상대경로(./filename 등) → 파일명만 추출
  const filename = videoUrl.replace(/^\.\//, '').split('/').pop();
  return filename ? `/videos/${filename}` : null;
}

/**
 * 자막 URL도 동일하게 변환
 */
export function toPublicSubtitleUrl(subtitleUrl: string | null | undefined): string | null {
  return toPublicVideoUrl(subtitleUrl);
}
