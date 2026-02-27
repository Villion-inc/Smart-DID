/**
 * Video Assembly Module
 * Stitches scene videos with FFmpeg, adds subtitles and title card
 */

import { SceneResult } from '../shared/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// FFmpeg paths: prefer ffmpeg-full (has libass for subtitles), fallback to standard ffmpeg
const FFMPEG_FULL_PATH = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const FFPROBE_FULL_PATH = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe';

// Detect available FFmpeg path at runtime
let ffmpegPath = 'ffmpeg';
let ffprobePath = 'ffprobe';

export class VideoAssembler {
  /**
   * Concat scene videos and burn subtitles (no title card).
   * Used by Pipeline V2 when scene buffers are written to temp files.
   */
  async concatAndSubtitles(
    scenes: SceneResult[],
    subtitlePath: string,
    outputPath: string
  ): Promise<string> {
    const hasFFmpeg = await this.checkFFmpeg();
    if (!hasFFmpeg) {
      throw new Error('FFmpeg not available');
    }
    const concatenatedPath = await this.concatenateScenes(scenes, outputPath);
    const finalPath = await this.addSubtitles(
      concatenatedPath,
      subtitlePath,
      outputPath
    );
    try {
      await fs.unlink(concatenatedPath);
    } catch {
      // ignore cleanup failure
    }
    return finalPath;
  }

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
   * Uses relative paths (basename) in concat list so FFmpeg works on Windows and with any cwd.
   */
  private async concatenateScenes(scenes: SceneResult[], outputPath: string): Promise<string> {
    const outDir = path.dirname(outputPath);
    const concatListPath = path.join(outDir, 'concat_list.txt');
    const fileList = scenes
      .map((scene) => {
        const p = scene.videoUrl ?? '';
        const base = path.basename(p);
        const safe = base.replace(/'/g, "'\\''");
        return `file '${safe}'`;
      })
      .join('\n');

    await fs.writeFile(concatListPath, fileList);

    const tempOutput = outputPath.replace('.mp4', '_concat.mp4');

    // FFmpeg concat command
    const command = `"${ffmpegPath}" -f concat -safe 0 -i "${concatListPath}" -c copy "${tempOutput}"`;

    await execAsync(command);

    // Clean up concat list
    await fs.unlink(concatListPath);

    return tempOutput;
  }

  /**
   * Add subtitles to video
   * FFmpeg subtitles filter requires special escaping for paths with colons, spaces, etc.
   */
  private async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string
  ): Promise<string> {
    const tempOutput = outputPath.replace('.mp4', '_subtitled.mp4');
    const videoPathNorm = videoPath.replace(/\\/g, '/');
    const outputNorm = tempOutput.replace(/\\/g, '/');
    
    // FFmpeg subtitles filter requires escaping: \ -> \\ , : -> \: , ' -> \'
    const subtitlePathEscaped = subtitlePath
      .replace(/\\/g, '/')
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'");

    // Subtitle style optimized for 720p video
    // FontSize=18 (readable but not overwhelming), Bold=1, Outline=2, Shadow=1
    const command = `"${ffmpegPath}" -i "${videoPathNorm}" -vf "subtitles='${subtitlePathEscaped}':force_style='FontSize=18,Bold=1,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BackColour=&H80000000,Outline=2,Shadow=1,BorderStyle=4,MarginV=30'" -c:a copy "${outputNorm}"`;

    await execAsync(command);

    return tempOutput;
  }

  /**
   * Add title card overlay
   * Uses system font or skips if unavailable
   */
  private async addTitleCard(
    videoPath: string,
    bookTitle: string,
    outputPath: string
  ): Promise<string> {
    const safeTitle = bookTitle.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    // Try common font paths (Linux/Docker, macOS, Windows)
    const fontPaths = [
      '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
      '/System/Library/Fonts/AppleSDGothicNeo.ttc',
      'C:/Windows/Fonts/malgun.ttf',
    ];

    let fontFile = '';
    for (const fp of fontPaths) {
      try {
        await fs.access(fp);
        fontFile = fp;
        break;
      } catch {
        continue;
      }
    }

    if (!fontFile) {
      console.warn('[Assembler] ⚠️  No suitable font found, skipping title card');
      await fs.copyFile(videoPath, outputPath);
      return outputPath;
    }

    const command = `"${ffmpegPath}" -i "${videoPath}" -vf "drawtext=text='${safeTitle}':fontfile='${fontFile}':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,20,24)'" -c:a copy "${outputPath}"`;

    await execAsync(command);

    return outputPath;
  }

  /**
   * Check if FFmpeg is installed and set the correct path
   * Prefers ffmpeg-full (has libass for subtitle burning)
   */
  private async checkFFmpeg(): Promise<boolean> {
    // Try ffmpeg-full first (has libass for subtitles filter)
    try {
      await execAsync(`"${FFMPEG_FULL_PATH}" -version`);
      ffmpegPath = FFMPEG_FULL_PATH;
      ffprobePath = FFPROBE_FULL_PATH;
      console.log('[Assembler] Using ffmpeg-full with libass support');
      return true;
    } catch {
      // ffmpeg-full not available
    }

    // Fallback to standard ffmpeg
    try {
      await execAsync('ffmpeg -version');
      ffmpegPath = 'ffmpeg';
      ffprobePath = 'ffprobe';
      console.log('[Assembler] Using standard ffmpeg (subtitle burning may fail without libass)');
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
    const command = `"${ffprobePath}" -v quiet -print_format json -show_streams "${videoPath}"`;

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
