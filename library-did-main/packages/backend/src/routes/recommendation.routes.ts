import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { videoService } from '../services/video.service';
import { bookService } from '../services/book.service';
import { RecommendationItem } from '@smart-did/shared';

const router = Router();

/**
 * GET /api/recommendations
 * Get ranked recommendations
 */
router.get(
  '/',
  [
    query('type').optional().isIn(['video', 'new_arrival', 'librarian_pick', 'bestseller']),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const videoRecords = await videoService.getRecommendations(limit);

      const recommendations: RecommendationItem[] = [];

      for (const record of videoRecords) {
        const book = await bookService.getBook(record.bookId);
        if (book) {
          recommendations.push({
            bookId: book.bookId,
            title: book.title,
            author: book.author,
            genre: book.genre,
            coverImageUrl: book.coverImageUrl,
            status: record.status,
            requestCount: record.requestCount,
            rankingScore: record.rankingScore,
            videoUrl: record.videoUrl,
          });
        }
      }

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
