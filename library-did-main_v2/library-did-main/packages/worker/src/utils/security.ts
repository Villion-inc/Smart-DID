/**
 * Security Utilities
 * Shell injection prevention (execFile), Regex injection prevention (escapeRegex).
 * Ported from trailer-engine/src/shared/utils/security.ts
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * FFmpeg command execution (shell injection prevention).
 * All arguments are passed as an array to prevent shell metacharacter interpretation.
 */
export async function ffmpegExec(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('ffmpeg', args);
}

/**
 * Escape regex metacharacters.
 * Call before using user input (e.g. character names) in RegExp.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
