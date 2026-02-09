import fs from 'fs/promises';
import { SubtitleEntry, Scene } from '../types';

/**
 * 자막 생성 서비스
 * WebVTT 형식의 한국어 자막 생성
 */
export class SubtitleGenerator {
  /**
   * 씬 정보를 기반으로 자막 엔트리 생성
   * @param scenes 씬 배열
   * @returns 자막 엔트리 배열
   */
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

  /**
   * 자막 엔트리를 WebVTT 형식으로 변환
   * @param entries 자막 엔트리 배열
   * @returns WebVTT 형식 문자열
   */
  convertToWebVTT(entries: SubtitleEntry[]): string {
    let vtt = 'WEBVTT\n\n';

    entries.forEach((entry) => {
      vtt += `${entry.index}\n`;
      vtt += `${entry.startTime} --> ${entry.endTime}\n`;
      vtt += `${entry.text}\n\n`;
    });

    return vtt;
  }

  /**
   * 자막 파일 생성 및 저장
   * @param scenes 씬 배열
   * @param outputPath 출력 파일 경로
   * @returns 저장된 파일 경로
   */
  async generateSubtitleFile(scenes: Scene[], outputPath: string): Promise<string> {
    console.log('[SubtitleGenerator] Generating subtitle file...');

    // 자막 엔트리 생성
    const entries = this.generateSubtitleEntries(scenes);

    // WebVTT 형식으로 변환
    const vttContent = this.convertToWebVTT(entries);

    // 파일 저장
    await fs.writeFile(outputPath, vttContent, 'utf-8');

    console.log(`[SubtitleGenerator] Subtitle file saved: ${outputPath}`);

    return outputPath;
  }

  /**
   * 초를 WebVTT 시간 형식으로 변환
   * @param seconds 초
   * @returns HH:MM:SS.mmm 형식
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${this.pad(hours, 2)}:${this.pad(minutes, 2)}:${this.pad(secs, 2)}.${this.pad(milliseconds, 3)}`;
  }

  /**
   * 숫자를 0으로 패딩
   * @param num 숫자
   * @param size 패딩 크기
   * @returns 패딩된 문자열
   */
  private pad(num: number, size: number): string {
    let s = num.toString();
    while (s.length < size) {
      s = '0' + s;
    }
    return s;
  }

  /**
   * SRT 형식으로 변환 (선택적)
   * @param entries 자막 엔트리 배열
   * @returns SRT 형식 문자열
   */
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
