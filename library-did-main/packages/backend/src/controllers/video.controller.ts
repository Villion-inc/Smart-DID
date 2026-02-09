import { FastifyRequest, FastifyReply } from 'fastify';
import { videoService } from '../services/video.service';

export class VideoController {
  async getVideoStatus(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const status = await videoService.getVideoStatus(bookId);

    if (!status) {
      return reply.code(404).send({
        success: false,
        error: 'Video record not found',
      });
    }

    return reply.send({
      success: true,
      data: status,
    });
  }

  async requestVideo(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;

    try {
      const result = await videoService.requestVideo(bookId, false);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to request video',
      });
    }
  }
}

export const videoController = new VideoController();
