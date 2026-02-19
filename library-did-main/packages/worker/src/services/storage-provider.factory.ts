import { config } from '../config';
import type { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './storage-local.provider';
import { S3StorageProvider } from './storage-s3.provider';

let defaultProvider: StorageProvider | null = null;

/**
 * config.storage.type에 따라 StorageProvider 인스턴스 반환
 */
export function getStorageProvider(): StorageProvider {
  if (defaultProvider) return defaultProvider;

  const type = (config.storage.type || 'local').toLowerCase();
  if (type === 's3') {
    defaultProvider = new S3StorageProvider();
  } else {
    defaultProvider = new LocalStorageProvider();
  }
  return defaultProvider;
}
