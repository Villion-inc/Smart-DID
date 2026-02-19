import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { SubtitleEntry } from '../types';

/**
 * 비디오 처리 서비스
 * FFmpeg를 사용하여 비디오 병합, 자막 추가 등을 처리합니다.
 */
export class VideoProcessor {
  /**
   * 여러 비디오 파일을 하나로 병합
   * @param videoPaths 병합할 비디오 파일 경로 배열
   * @param outputPath 출력 파일 경로
   * @returns 병합된 비디오 경로
   */
  async concatenateVideos(
    videoPaths: string[],
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('[VideoProcessor] Concatenating videos...');

      // FFmpeg concat 필터 사용
      const command = ffmpeg();

      // 입력 파일 추가
      videoPaths.forEach((videoPath) => {
        command.input(videoPath);
      });

      // concat 필터 적용 및 출력
      command
        .on('start', (commandLine) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`[VideoProcessor] Processing: ${progress.percent}% done`);
        })
        .on('end', () => {
          console.log('[VideoProcessor] Video concatenation finished!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('[VideoProcessor] Error:', err.message);
          reject(err);
        })
        .mergeToFile(outputPath, path.dirname(outputPath));
    });
  }

  /**
   * 비디오에 자막 추가
   * @param videoPath 원본 비디오 경로
   * @param subtitlePath 자막 파일 경로 (.vtt)
   * @param outputPath 출력 비디오 경로
   * @returns 자막이 추가된 비디오 경로
   */
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
        .on('start', (commandLine) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(
            `[VideoProcessor] Adding subtitles: ${progress.percent}% done`
          );
        })
        .on('end', () => {
          console.log('[VideoProcessor] Subtitles added successfully!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('[VideoProcessor] Error adding subtitles:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 더미 비디오 생성 (테스트용)
   * 실제 비디오 생성 서비스가 없을 때 사용
   * @param duration 비디오 길이 (초)
   * @param text 비디오에 표시할 텍스트
   * @param outputPath 출력 경로
   */
  async createDummyVideo(
    duration: number,
    text: string,
    outputPath: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log(`[VideoProcessor] Creating dummy video (${duration}s)...`);

      // 컬러 배경과 텍스트로 더미 비디오 생성
      ffmpeg()
        .input(`color=c=blue:s=1920x1080:d=${duration}`)
        .inputFormat('lavfi')
        .outputOptions([
          '-pix_fmt yuv420p',
          `-vf drawtext=fontfile=/System/Library/Fonts/Supplemental/Arial.ttf:text='${text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[VideoProcessor] FFmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log('[VideoProcessor] Dummy video created!');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('[VideoProcessor] Error:', err.message);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 비디오 메타데이터 추출
   * @param videoPath 비디오 파일 경로
   * @returns 비디오 메타데이터
   */
  async getVideoMetadata(videoPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * 비디오 길이 가져오기
   * @param videoPath 비디오 파일 경로
   * @returns 비디오 길이 (초)
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    const metadata = await this.getVideoMetadata(videoPath);
    return metadata.format.duration || 0;
  }
}
