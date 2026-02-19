/**
 * Video generation constants
 */
export const VIDEO_CONSTANTS = {
  TOTAL_DURATION: 24,
  SCENE_DURATION: 8,
  SCENE_COUNT: 3,
  MAX_RETRIES: 3,
  DEFAULT_EXPIRY_DAYS: 90,
} as const;

/**
 * Ranking constants
 */
export const RANKING_CONSTANTS = {
  RECENT_DAYS: 7,
  RECENT_WEIGHT: 1.5,
} as const;

/**
 * Safety filter keywords (child-unfriendly content)
 */
export const UNSAFE_KEYWORDS = [
  'horror',
  'violence',
  'political',
  'dark',
  'scary',
  'death',
  'blood',
  'weapon',
  'war',
] as const;
