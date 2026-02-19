import { RANKING_CONSTANTS } from '../constants/video.constants';

/**
 * Calculate ranking score based on total requests and recent activity
 * @param requestCount - Total number of requests
 * @param recent7DayRequests - Requests in the last 7 days
 * @returns Calculated ranking score
 */
export function calculateRankingScore(
  requestCount: number,
  recent7DayRequests: number
): number {
  return requestCount + recent7DayRequests * RANKING_CONSTANTS.RECENT_WEIGHT;
}

/**
 * Calculate expiration date from now
 * @param days - Number of days until expiration
 * @returns Expiration date
 */
export function calculateExpirationDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check if a video is expired
 * @param expiresAt - Expiration date
 * @returns True if expired
 */
export function isVideoExpired(expiresAt?: Date): boolean {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
}
