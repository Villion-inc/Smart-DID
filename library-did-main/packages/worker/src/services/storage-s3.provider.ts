import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../config/logger';
import type { StorageProvider } from './storage.provider';

/**
 * S3 StorageProvider (AWS SDK v3 연동)
 * STORAGE_TYPE=s3, S3_BUCKET, S3_REGION, AWS credentials 설정 필요
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private baseUrl: string;
  private client: S3Client;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    this.region = process.env.S3_REGION || 'ap-northeast-2';
    this.baseUrl =
      process.env.S3_PUBLIC_BASE_URL ||
      `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    if (!this.bucket) {
      logger.warn('S3StorageProvider: S3_BUCKET not set');
    }
    this.client = new S3Client({
      region: this.region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  private normalizeKey(key: string): string {
    return key.replace(/\.\./g, '').replace(/^\/+/, '');
  }

  async save(
    key: string,
    data: Buffer,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!this.bucket) {
      throw new Error('S3 not configured: set S3_BUCKET and AWS credentials');
    }
    const safeKey = this.normalizeKey(key);
    const contentType =
      (metadata?.contentType as string) || 'application/octet-stream';
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Body: data,
        ContentType: contentType,
      })
    );
    logger.debug(`S3Storage: saved ${safeKey}`);
    return this.getUrl(safeKey);
  }

  async load(key: string): Promise<Buffer> {
    if (!this.bucket) {
      throw new Error('S3 not configured');
    }
    const safeKey = this.normalizeKey(key);
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: safeKey })
    );
    const body = res.Body;
    if (!body) throw new Error(`S3 get empty body: ${safeKey}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.bucket) return false;
    const safeKey = this.normalizeKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: safeKey })
      );
      return true;
    } catch {
      return false;
    }
  }

  /** 퍼블릭 URL 반환. private 버킷이면 getPresignedUrl() 사용 */
  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key);
    return `${this.baseUrl}/${safeKey}`;
  }

  /** private 버킷일 때 일시적 다운로드/스트리밍 URL (만료 시간 초 단위) */
  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (!this.bucket) throw new Error('S3 not configured');
    const safeKey = this.normalizeKey(key);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }),
      { expiresIn: expiresInSeconds }
    );
  }
}
