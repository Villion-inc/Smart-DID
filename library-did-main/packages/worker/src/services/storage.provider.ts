/**
 * 저장소 추상화: 로컬 / S3 등 교체 가능
 */

export interface StorageProvider {
  save(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<string>;
  load(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}
