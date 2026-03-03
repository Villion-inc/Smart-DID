import { Storage as GCSStorage } from '@google-cloud/storage';
import { logger } from '../config/logger';
import type { StorageProvider } from './storage.provider';

/**
 * Google Cloud Storage Provider
 * STORAGE_TYPE=gcs 일 때 사용
 * GCS_BUCKET 환경변수 필요, GCP 인증은 ADC(Application Default Credentials) 사용
 */
export class GcsStorageProvider implements StorageProvider {
  private bucket: string;
  private publicBaseUrl: string;
  private client: GCSStorage;

  constructor() {
    this.bucket = process.env.GCS_BUCKET || '';
    this.publicBaseUrl =
      process.env.GCS_PUBLIC_BASE_URL ||
      `https://storage.googleapis.com/${this.bucket}`;
    if (!this.bucket) {
      logger.warn('GcsStorageProvider: GCS_BUCKET not set');
    }
    this.client = new GCSStorage();
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
      throw new Error('GCS not configured: set GCS_BUCKET');
    }
    const safeKey = this.normalizeKey(key);
    const contentType =
      (metadata?.contentType as string) ||
      (safeKey.endsWith('.vtt') ? 'text/vtt' : 'video/mp4');

    const file = this.client.bucket(this.bucket).file(safeKey);
    await file.save(data, {
      contentType,
      resumable: data.length > 5 * 1024 * 1024,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });

    logger.debug(`GcsStorage: saved ${safeKey}`);
    return this.getUrl(safeKey);
  }

  async load(key: string): Promise<Buffer> {
    if (!this.bucket) {
      throw new Error('GCS not configured');
    }
    const safeKey = this.normalizeKey(key);
    const [data] = await this.client.bucket(this.bucket).file(safeKey).download();
    return Buffer.from(data);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.bucket) return false;
    const safeKey = this.normalizeKey(key);
    try {
      const [exists] = await this.client.bucket(this.bucket).file(safeKey).exists();
      return exists;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    const safeKey = this.normalizeKey(key);
    return `/videos/${safeKey}`;
  }
}
