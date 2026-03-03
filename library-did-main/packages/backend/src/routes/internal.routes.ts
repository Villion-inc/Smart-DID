import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { videoRepository } from '../repositories/video.repository';
import { VideoStatus } from '../types';
import { alpasService } from '../services/alpas.service';

interface VideoCallbackBody {
  bookId: string;
  status: 'READY' | 'FAILED';
  videoUrl?: string;
  subtitleUrl?: string;
  errorMessage?: string;
}

interface BookSearchQuery {
  title?: string;
  author?: string;
}

export async function internalRoutes(fastify: FastifyInstance) {
  /**
   * Worker에서 Alpas 도서 검색 (내부 API)
   * GET /internal/book-search?title=xxx&author=xxx
   * Header: X-Internal-Secret
   */
  fastify.get<{ Querystring: BookSearchQuery }>(
    '/internal/book-search',
    async (request: FastifyRequest<{ Querystring: BookSearchQuery }>, reply: FastifyReply) => {
      const received = String(request.headers['x-internal-secret'] ?? '').trim();
      const expected = String(config.internalApiSecret ?? '').trim();
      if (!expected || received !== expected) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { title, author } = request.query;
      if (!title) {
        return reply.code(400).send({ success: false, error: 'title query parameter is required' });
      }

      try {
        const books = await alpasService.searchBooks(title);
        return reply.send({ success: true, data: books });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to search books via Alpas',
        });
      }
    }
  );

  /**
   * Worker 영상 생성 완료/실패 콜백
   * Header: X-Internal-Secret (config.internalApiSecret과 일치해야 함)
   */
  fastify.post<{ Body: VideoCallbackBody }>(
    '/internal/video-callback',
    async (request: FastifyRequest<{ Body: VideoCallbackBody }>, reply: FastifyReply) => {
      const received = String(request.headers['x-internal-secret'] ?? '').trim();
      const expected = String(config.internalApiSecret ?? '').trim();
      if (!expected || received !== expected) {
        fastify.log.warn(
          {
            headerPresent: received.length > 0,
            expectedLen: expected.length,
            receivedLen: received.length,
          },
          'video-callback: Unauthorized'
        );
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { bookId, status, videoUrl, subtitleUrl, errorMessage } = request.body || {};
      if (!bookId || !status) {
        return reply.code(400).send({
          success: false,
          error: 'bookId and status are required',
        });
      }
      if (status !== 'READY' && status !== 'FAILED') {
        return reply.code(400).send({
          success: false,
          error: 'status must be READY or FAILED',
        });
      }

      try {
        const existing = await videoRepository.findByBookId(bookId);
        if (!existing) {
          return reply.code(404).send({
            success: false,
            error: 'Video record not found for bookId',
          });
        }

        const updateData: Partial<{
          status: VideoStatus;
          videoUrl: string | null;
          subtitleUrl: string | null;
          errorMessage: string | null;
        }> = {
          status: status as VideoStatus,
          errorMessage: errorMessage ?? null,
        };
        if (status === 'READY') {
          updateData.videoUrl = videoUrl ?? null;
          updateData.subtitleUrl = subtitleUrl ?? null;
        }

        await videoRepository.update(bookId, updateData);

        return reply.send({
          success: true,
          data: { bookId, status },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update video record',
        });
      }
    }
  );
}
