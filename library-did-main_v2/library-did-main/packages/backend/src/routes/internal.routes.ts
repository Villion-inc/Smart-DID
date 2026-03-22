import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../config';
import { videoRepository } from '../repositories/video.repository';
import { VideoStatus } from '../types';
import { alpasService } from '../services/alpas.service';

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // 길이가 다르면 상수 시간 비교를 위해 동일 길이로 맞춤
    const dummy = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(dummy, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

interface VideoCallbackBody {
  bookId: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
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
      if (!expected || !timingSafeCompare(received, expected)) {
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
          error: 'Internal server error',
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
      if (!expected || !timingSafeCompare(received, expected)) {
        fastify.log.warn('video-callback: Unauthorized');
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      const { bookId, status, videoUrl, subtitleUrl, errorMessage } = request.body || {};
      if (!bookId || !status) {
        return reply.code(400).send({
          success: false,
          error: 'bookId and status are required',
        });
      }
      if (status !== 'GENERATING' && status !== 'READY' && status !== 'FAILED') {
        return reply.code(400).send({
          success: false,
          error: 'status must be GENERATING, READY or FAILED',
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
          error: 'Internal server error',
        });
      }
    }
  );
}
