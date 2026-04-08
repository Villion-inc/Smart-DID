/**
 * Pipeline Orchestrator V8 — 26s Trailer (Python video-engine-v8)
 *
 * Python 스크립트(generate_book_trailer.py)를 subprocess로 실행하여
 * 26초 예고편을 생성한 뒤 GCS에 업로드합니다.
 *
 * 구조: 설정샷(4s) → 로그라인(4s) → 분위기샷(6s) → 감정샷(4s) → 질문(4s) → 타이틀(4s)
 */

import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { VideoGenerationRequest } from '../shared/types';
import { logger } from '../config/logger';
import { getStorageProvider } from '../services/storage-provider.factory';

interface V8PipelineResult {
  jobId: string;
  status: 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
  cacheHit: boolean;
  mode: string;
  createdAt: string;
  completedAt?: string;
}

// Python 스크립트 경로 (Docker 컨테이너 기준)
const PYTHON_SCRIPT = process.env.V8_SCRIPT_PATH ||
  path.join(__dirname, '../../../../video-engine-v8/generate_book_trailer.py');

export class PipelineOrchestratorV8 {
  async execute(request: VideoGenerationRequest & { bookId?: string }): Promise<V8PipelineResult> {
    const jobId = request.bookId || `v8_${Date.now()}`;
    const startTime = Date.now();

    logger.info(`[V8] Starting job ${jobId} — "${request.title}"`);

    // 임시 출력 파일 경로
    const tempOutput = `/tmp/${jobId}_trailer.mp4`;

    try {
      const outputFilePath = await this.runPython(request.title, request.author || '', tempOutput);

      // GCS 업로드
      let videoUrl: string | undefined;
      try {
        const videoBuffer = await fs.readFile(outputFilePath);
        const storage = getStorageProvider();
        const videoKey = `${jobId}-${Date.now()}.mp4`;
        const savedUrl = await storage.save(videoKey, videoBuffer);
        videoUrl = savedUrl.startsWith('/videos/') ? '/api' + savedUrl : savedUrl;
        logger.info(`[V8] ✅ Video saved: ${videoUrl}`);
      } catch (err: any) {
        logger.error(`[V8] ⚠️ Storage save failed: ${err.message}`);
      }

      // 임시 파일 정리
      try { await fs.rm(tempOutput, { force: true }); } catch {}

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`[V8] ✅ Job ${jobId} COMPLETED in ${elapsed}s`);

      return {
        jobId,
        status: 'completed',
        videoUrl,
        cacheHit: false,
        mode: 'v8-python-26s',
        createdAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`[V8] ❌ Job ${jobId} FAILED: ${error.message}`);
      try { await fs.rm(tempOutput, { force: true }); } catch {}
      return {
        jobId,
        status: 'failed',
        error: error.message,
        cacheHit: false,
        mode: 'v8-python-26s',
        createdAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    }
  }

  private runPython(title: string, author: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        PYTHON_SCRIPT,
        '--title', title,
        '--author', author,
        '--output', outputPath,
      ];

      logger.info(`[V8] Running: python3 ${args.join(' ')}`);

      const proc = spawn('python3', args, {
        env: { ...process.env },
        timeout: 30 * 60 * 1000, // 30분 타임아웃
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        const line = d.toString();
        stdout += line;
        process.stdout.write(`[V8-py] ${line}`);
      });

      proc.stderr.on('data', (d) => {
        const line = d.toString();
        stderr += line;
        process.stderr.write(`[V8-py-err] ${line}`);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}\n${stderr.slice(-500)}`));
          return;
        }

        // stdout 마지막 줄에서 OUTPUT_FILE= 파싱
        const match = stdout.match(/OUTPUT_FILE=(.+)/);
        if (match) {
          resolve(match[1].trim());
        } else {
          // fallback: --output 경로 사용
          resolve(outputPath);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn python3: ${err.message}`));
      });
    });
  }
}
