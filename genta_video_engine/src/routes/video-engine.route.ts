import { Router, Request, Response } from 'express';
import { VideoEngine } from '../services/video-engine';
import { VideoGenerationRequest } from '../types';

const router = Router();
const videoEngine = new VideoEngine();

/**
 * POST /video-engine
 * 비디오 생성 엔드포인트
 */
router.post('/video-engine', async (req: Request, res: Response) => {
  try {
    console.log('[API] Received video generation request');

    // 요청 본문 검증
    const { bookTitle, author, summary } = req.body as VideoGenerationRequest;

    if (!bookTitle || !author || !summary) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookTitle, author, summary',
      });
    }

    // 입력 검증
    if (bookTitle.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'bookTitle is too long (max 200 characters)',
      });
    }

    if (summary.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'summary is too long (max 1000 characters)',
      });
    }

    console.log(`[API] Generating video for: ${bookTitle} by ${author}`);

    // 비디오 생성
    const result = await videoEngine.generateVideo({
      bookTitle,
      author,
      summary,
    });

    // 응답
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('[API] Unexpected error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * GET /health
 * 헬스 체크 엔드포인트
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
