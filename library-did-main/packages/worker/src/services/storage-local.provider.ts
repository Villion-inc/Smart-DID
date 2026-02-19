import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../config/logger';
import type { StorageProvider } from './storage.provider';

/**
 * 로컬 디스크 StorageProvider
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? config.storage.path;
  }

  async save(key: string, data: Buffer, _metadata?: Record<string, unknown>): Promise<string> {
    await fs.mkdir(this.basePath, { recursive: true });
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    const filepath = path.join(this.basePath, safeKey);
    await fs.writeFile(filepath, data);
    logger.debug(`LocalStorage: saved ${safeKey}`);
    return this.getUrl(safeKey);
  }

  async load(key: string): Promise<Buffer> {
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    const filepath = path.join(this.basePath, safeKey);
    return fs.readFile(filepath);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
      const filepath = path.join(this.basePath, safeKey);
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return `/videos/${safeKey}`;
  }
}
