/**
 * Video Assembly Module
 * Stitches scene videos with FFmpeg, adds subtitles and title card
 */

import { SceneResult, TypographyPlan } from '../shared/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class VideoAssembler {
  /**
   * Assemble final video from scene videos
   */
  async assemble(
    scenes: SceneResult[],
    subtitlePath: string,
    outputPath: string,
    bookTitle: string
  ): Promise<string> {
    console.log('[Assembler] Starting video assembly...');

    // Check if FFmpeg is available
    const hasFFmpeg = await this.checkFFmpeg();
    if (!hasFFmpeg) {
      console.warn('[Assembler] ⚠️  FFmpeg not available - skipping assembly');
      return this.createPlaceholder(scenes, outputPath);
    }

    try {
      // Step 1: Concatenate scene videos
      console.log('[Assembler] Step 1: Concatenating scenes...');
      const concatenatedPath = await this.concatenateScenes(scenes, outputPath);

      // Step 2: Add subtitles
      console.log('[Assembler] Step 2: Adding subtitles...');
      const withSubtitlesPath = await this.addSubtitles(
        concatenatedPath,
        subtitlePath,
        outputPath
      );

      // Step 3: Add title card overlay (last 4 seconds)
      console.log('[Assembler] Step 3: Adding title card...');
      const finalPath = await this.addTitleCard(
        withSubtitlesPath,
        bookTitle,
        outputPath
      );

      console.log(`[Assembler] ✅ Assembly complete: ${finalPath}`);
      return finalPath;
    } catch (error: any) {
      console.error('[Assembler] ❌ Assembly failed:', error.message);
      throw error;
    }
  }

  /**
   * Concatenate scene videos
   */
  private async concatenateScenes(scenes: SceneResult[], outputPath: string): Promise<string> {
    // Create concat file list
    const concatListPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const fileList = scenes
      .map(scene => `file '${scene.videoUrl}'`)
      .join('\n');

    await fs.writeFile(concatListPath, fileList);

    const tempOutput = outputPath.replace('.mp4', '_concat.mp4');

    // FFmpeg concat command
    const command = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy "${tempOutput}"`;

    await execAsync(command);

    // Clean up concat list
    await fs.unlink(concatListPath);

    return tempOutput;
  }

  /**
   * Add subtitles to video
   */
  private async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string
  ): Promise<string> {
    const tempOutput = outputPath.replace('.mp4', '_subtitled.mp4');

    // FFmpeg subtitle command (burn subtitles into video)
    const command = `ffmpeg -i "${videoPath}" -vf "subtitles=${subtitlePath}:force_style='FontName=Noto Sans KR,FontSize=22,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Shadow=1,MarginV=80'" -c:a copy "${tempOutput}"`;

    await execAsync(command);

    return tempOutput;
  }

  /**
   * Add title card overlay
   */
  private async addTitleCard(
    videoPath: string,
    bookTitle: string,
    outputPath: string
  ): Promise<string> {
    // Add text overlay for last 4 seconds (20-24s)
    const command = `ffmpeg -i "${videoPath}" -vf "drawtext=text='${bookTitle}':fontfile=/path/to/font.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,20,24)'" -c:a copy "${outputPath}"`;

    await execAsync(command);

    return outputPath;
  }

  /**
   * Check if FFmpeg is installed
   */
  private async checkFFmpeg(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create placeholder result when FFmpeg is not available
   */
  private async createPlaceholder(scenes: SceneResult[], outputPath: string): Promise<string> {
    // Return a reference to individual scene videos
    const sceneUrls = scenes.map(s => s.videoUrl).join('\n');

    const placeholderPath = outputPath.replace('.mp4', '_scenes.txt');
    await fs.writeFile(
      placeholderPath,
      `Video assembly requires FFmpeg.\n\nScene videos:\n${sceneUrls}\n\nInstall FFmpeg to generate final video.`
    );

    return placeholderPath;
  }

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
  }> {
    const command = `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`;

    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);

    const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

    return {
      duration: parseFloat(videoStream.duration || data.format?.duration || 0),
      width: videoStream.width || 1280,
      height: videoStream.height || 720,
      fps: eval(videoStream.r_frame_rate || '24/1'), // e.g., "24/1" -> 24
      codec: videoStream.codec_name || 'unknown',
    };
  }
}
