import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../config/logger';

/**
 * Service for storing videos and subtitles
 */
export class StorageService {
  private storagePath: string;

  constructor() {
    this.storagePath = config.storage.path;
    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      logger.info(`Storage directory ready: ${this.storagePath}`);
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
    }
  }

  /**
   * Save video file
   */
  async saveVideo(bookId: string, videoData: Buffer): Promise<string> {
    const filename = `${bookId}-${Date.now()}.mp4`;
    const filepath = path.join(this.storagePath, filename);

    try {
      await fs.writeFile(filepath, videoData);
      logger.info(`Video saved: ${filepath}`);
      return `/videos/${filename}`;
    } catch (error) {
      logger.error(`Failed to save video for ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * Save subtitle file (VTT format)
   */
  async saveSubtitle(bookId: string, subtitleContent: string): Promise<string> {
    const filename = `${bookId}-${Date.now()}.vtt`;
    const filepath = path.join(this.storagePath, filename);

    try {
      await fs.writeFile(filepath, subtitleContent, 'utf-8');
      logger.info(`Subtitle saved: ${filepath}`);
      return `/videos/${filename}`;
    } catch (error) {
      logger.error(`Failed to save subtitle for ${bookId}:`, error);
      throw error;
    }
  }

  /**
   * Generate VTT subtitle file content
   */
  generateVTTContent(subtitles: Array<{ start: number; end: number; text: string }>): string {
    let vtt = 'WEBVTT\n\n';

    subtitles.forEach((sub, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${this.formatTime(sub.start)} --> ${this.formatTime(sub.end)}\n`;
      vtt += `${sub.text}\n\n`;
    });

    return vtt;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(3, '0')}`;
  }

  /**
   * Delete video and subtitle files
   */
  async deleteVideo(videoUrl: string, subtitleUrl: string): Promise<void> {
    try {
      const videoPath = path.join(this.storagePath, path.basename(videoUrl));
      const subtitlePath = path.join(this.storagePath, path.basename(subtitleUrl));

      await Promise.all([fs.unlink(videoPath), fs.unlink(subtitlePath)]);

      logger.info(`Deleted video: ${videoPath} and subtitle: ${subtitlePath}`);
    } catch (error) {
      logger.error('Failed to delete video files:', error);
    }
  }
}

export const storageService = new StorageService();
