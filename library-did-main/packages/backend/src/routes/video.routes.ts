import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { config } from '../config';

/**
 * Serve generated video and subtitle files.
 * GET /api/videos/:filename
 * 1) 로컬 storage.path에서 찾기
 * 2) STORAGE_TYPE=gcs이면 GCS 버킷에서 스트리밍 (프록시)
 */
export async function videoRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { filename: string } }>('/videos/:filename', async (request, reply) => {
    const { filename } = request.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!['.mp4', '.vtt', '.webm'].includes(ext)) {
      return reply.code(400).send({ error: 'Invalid file type' });
    }
    const contentType = ext === '.vtt' ? 'text/vtt' : 'video/mp4';

    // 1) 로컬 파일 확인 (경로 탐색 방지)
    const filePath = path.join(config.storage.path, filename);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(config.storage.path))) {
      return reply.code(400).send({ error: 'Invalid filename' });
    }
    try {
      await fs.access(filePath);
      const stream = createReadStream(filePath);
      return reply.type(contentType).send(stream);
    } catch {
      // 로컬에 없음 → GCS fallback
    }

    // 2) GCS fallback
    const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
    const gcsBucket = process.env.GCS_BUCKET;
    if (storageType === 'gcs' && gcsBucket) {
      try {
        const { Storage } = await import('@google-cloud/storage');
        const gcs = new Storage();
        const file = gcs.bucket(gcsBucket).file(filename);
        const [exists] = await file.exists();
        if (!exists) {
          return reply.code(404).send({ error: 'File not found in GCS' });
        }
        reply.type(contentType);
        reply.header('Cache-Control', 'public, max-age=86400');
        return reply.send(file.createReadStream());
      } catch (err: any) {
        fastify.log.error(`GCS proxy error: ${err.message}`);
        return reply.code(500).send({ error: 'GCS fetch failed' });
      }
    }

    return reply.code(404).send({ error: 'File not found' });
  });
}
