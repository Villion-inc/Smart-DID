import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { SubtitleEntry } from '../types';

/**
 * 비디오 처리 서비스
 * trailer-engine 그대로 사용 — FFmpeg 병합/자막
 */
export class VideoProcessor {
  async concatenateVideos(
    videoPaths: string[],
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[VideoProcessor] Concatenating videos...');

      const command = ffmpeg();

      videoPaths.forEach((videoPath) => {
        command.input(videoPath);
      });

      command
        .on('start', (commandLine: string) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('progress', (progress: { percent?: number }) => {
          console.log(`[VideoProcessor] Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('[VideoProcessor] Video concatenation finished!');
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          console.error('[VideoProcessor] Error:', err.message);
          reject(err);
        })
        .mergeToFile(outputPath, path.dirname(outputPath));
    });
  }

  async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[VideoProcessor] Adding subtitles to video...');

      ffmpeg(videoPath)
        .outputOptions([
          `-vf subtitles=${subtitlePath}:force_style='FontName=AppleSDGothicNeo-Medium,FontSize=14,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BackColour=&H00000000&,BorderStyle=1,Outline=1,Shadow=0,MarginV=25,Alignment=2'`,
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('progress', (progress: { percent?: number }) => {
          console.log(
            `[VideoProcessor] Adding subtitles: ${progress.percent}% done`
          );
        })
        .on('end', () => {
          console.log('[VideoProcessor] Subtitles added successfully!');
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          console.error('[VideoProcessor] Error adding subtitles:', err.message);
          reject(err);
        })
        .run();
    });
  }

  async createDummyVideo(
    duration: number,
    text: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[VideoProcessor] Creating dummy video (${duration}s)...`);

      ffmpeg()
        .input(`color=c=blue:s=1920x1080:d=${duration}`)
        .inputFormat('lavfi')
        .outputOptions([
          '-pix_fmt yuv420p',
          `-vf drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
        ])
        .output(outputPath)
        .on('start', (commandLine: string) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log('[VideoProcessor] Dummy video created!');
          resolve(outputPath);
        })
        .on('error', (err: Error) => {
          console.error('[VideoProcessor] Error:', err.message);
          reject(err);
        })
        .run();
    });
  }

  async getVideoMetadata(videoPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
        if (err) reject(err);
        else resolve(metadata!);
      });
    });
  }

  async getVideoDuration(videoPath: string): Promise<number> {
    const metadata = await this.getVideoMetadata(videoPath);
    return metadata.format.duration || 0;
  }
}
