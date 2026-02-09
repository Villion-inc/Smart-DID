import { logger } from '../config/logger';
import type { StorageProvider } from './storage.provider';

/**
 * S3 StorageProvider (스텁)
 * STORAGE_TYPE=s3, S3_BUCKET, S3_REGION, AWS credentials 설정 후 구현 연동
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || '';
    this.region = process.env.S3_REGION || 'ap-northeast-2';
    this.baseUrl = process.env.S3_PUBLIC_BASE_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    if (!this.bucket) {
      logger.warn('S3StorageProvider: S3_BUCKET not set');
    }
  }

  async save(_key: string, _data: Buffer, _metadata?: Record<string, unknown>): Promise<string> {
    if (!this.bucket) {
      throw new Error('S3 not configured: set S3_BUCKET and AWS credentials');
    }
    // TODO: AWS SDK PutObject 연동
    throw new Error('S3StorageProvider not implemented; use STORAGE_TYPE=local');
  }

  async load(_key: string): Promise<Buffer> {
    if (!this.bucket) {
      throw new Error('S3 not configured');
    }
    throw new Error('S3StorageProvider not implemented; use STORAGE_TYPE=local');
  }

  async exists(_key: string): Promise<boolean> {
    if (!this.bucket) return false;
    return false;
  }

  getUrl(key: string): string {
    const safe = key.replace(/^\/+/, '');
    return `${this.baseUrl}/${safe}`;
  }
}
