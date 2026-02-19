import fs from 'fs/promises';
import { SubtitleEntry, Scene } from '../types';

/**
 * 자막 생성 서비스
 * trailer-engine 그대로 사용 — WebVTT 형식의 한국어 자막 생성
 */
export class SubtitleGenerator {
  generateSubtitleEntries(scenes: Scene[]): SubtitleEntry[] {
    const entries: SubtitleEntry[] = [];

    scenes.forEach((scene, index) => {
      const startSeconds = scene.sceneNumber === 1 ? 0 : (scene.sceneNumber - 1) * scene.duration;
      const endSeconds = scene.sceneNumber * scene.duration;

      entries.push({
        index: index + 1,
        startTime: this.formatTime(startSeconds),
        endTime: this.formatTime(endSeconds),
        text: scene.narration,
      });
    });

    return entries;
  }

  convertToWebVTT(entries: SubtitleEntry[]): string {
    let vtt = 'WEBVTT\n\n';

    entries.forEach((entry) => {
      vtt += `${entry.index}\n`;
      vtt += `${entry.startTime} --> ${entry.endTime}\n`;
      vtt += `${entry.text}\n\n`;
    });

    return vtt;
  }

  async generateSubtitleFile(scenes: Scene[], outputPath: string): Promise<string> {
    console.log('[SubtitleGenerator] Generating subtitle file...');

    const entries = this.generateSubtitleEntries(scenes);
    const vttContent = this.convertToWebVTT(entries);

    await fs.writeFile(outputPath, vttContent, 'utf-8');

    console.log(`[SubtitleGenerator] Subtitle file saved: ${outputPath}`);

    return outputPath;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}.${this.pad(milliseconds, 3)}`;
  }

  private pad(num: number, size: number): string {
    let s = num.toString();
    while (s.length < size) {
      s = '0' + s;
    }
    return s;
  }

  convertToSRT(entries: SubtitleEntry[]): string {
    let srt = '';

    entries.forEach((entry) => {
      srt += `${entry.index}\n`;
      srt += `${entry.startTime.replace('.', ',')} --> ${entry.endTime.replace('.', ',')}\n`;
      srt += `${entry.text}\n\n`;
    });

    return srt;
  }
}
