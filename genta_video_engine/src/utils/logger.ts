/**
 * 간단한 로거 유틸리티
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[${this.context}] ERROR: ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] WARN: ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG: ${message}`, ...args);
    }
  }
}
