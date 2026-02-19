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
 */
export async function notifyBackendVideoCallback(payload: BackendCallbackPayload): Promise<boolean> {
  const base = config.backendUrl.replace(/\/$/, '');
  const url = `${base}/api/internal/video-callback`;

  if (!config.internalApiSecret) {
    logger.warn('INTERNAL_API_SECRET not set; skipping backend callback');
    return false;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': config.internalApiSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`Backend callback failed: ${res.status} ${text}`);
      return false;
    }

    logger.info(`Backend callback success: bookId=${payload.bookId} status=${payload.status}`);
    return true;
  } catch (error: any) {
    logger.error('Backend callback request error:', error?.message || error);
    return false;
  }
}
