/**
 * Evolution Memory Stub
 * Simple in-memory stubs for evolution system.
 * Will be replaced with persistent storage when evolution pipeline is fully ported.
 */

export async function getLessonCount(): Promise<number> {
  return 0;
}

export async function getSummaryForPrompt(genre: string): Promise<string | null> {
  return null;
}
