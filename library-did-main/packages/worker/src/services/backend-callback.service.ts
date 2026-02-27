import { config } from '../config';
import { logger } from '../config/logger';

export type CallbackStatus = 'READY' | 'FAILED';

export interface BackendCallbackPayload {
  bookId: string;
  status: CallbackStatus;
  videoUrl?: string;
  subtitleUrl?: string;
  errorMessage?: string;
}

/**
 * Worker → Backend 내부 콜백 (영상 생성 완료/실패 시 VideoRecord 갱신)
 * 실패 시 최대 3회 재시도 (exponential backoff)
 */
export async function notifyBackendVideoCallback(
  payload: BackendCallbackPayload,
  maxRetries: number = 3
): Promise<boolean> {
  const base = config.backendUrl.replace(/\/$/, '');
  const url = `${base}/api/internal/video-callback`;

  if (!config.internalApiSecret) {
    logger.warn('INTERNAL_API_SECRET not set; skipping backend callback');
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': config.internalApiSecret,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        logger.info(`Backend callback success: bookId=${payload.bookId} status=${payload.status}`);
        return true;
      }

      const text = await res.text();
      logger.error(`Backend callback failed (attempt ${attempt}/${maxRetries}): ${res.status} ${text}`);

      // 4xx 에러는 재시도 불필요 (잘못된 요청)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        logger.error('Client error, not retrying');
        return false;
      }
    } catch (error: any) {
      logger.error(`Backend callback request error (attempt ${attempt}/${maxRetries}):`, error?.message || error);
    }

    // 재시도 전 대기 (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      logger.info(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  logger.error(`Backend callback failed after ${maxRetries} attempts: bookId=${payload.bookId}`);
  return false;
}
