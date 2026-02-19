import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { config } from '../config';

/**
 * Serve generated video and subtitle files from storage path.
 * GET /api/videos/:filename → storage.path/filename
 * - .mp4 → video/mp4, .vtt → text/vtt
 */
export async function videoRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { filename: string } }>('/videos/:filename', async (request, reply) => {
    const { filename } = request.params;
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    const filePath = path.join(config.storage.path, filename);
    try {
      await fs.access(filePath);
    } catch {
      return reply.code(404).send({ error: 'File not found' });
    }
    const stream = createReadStream(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.vtt' ? 'text/vtt' : 'video/mp4';
    return reply.type(contentType).send(stream);
  });
}
