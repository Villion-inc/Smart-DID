/**
 * Shared Types for Video Engine
 */

export type SceneNumber = 1 | 2 | 3;
export type SceneType = 'intro' | 'body' | 'outro';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type QCStatus = 'PASS' | 'FAIL';
export type GenerationMode = 'parallel' | 'sequential';

export interface VideoGenerationRequest {
  title: string;
  author?: string;
  language: 'ko' | 'en';
  style?: 'animation-3d' | 'animation-2d';
}

export interface VideoGenerationJob {
  jobId: string;
  request: VideoGenerationRequest;
  status: JobStatus;
  mode: GenerationMode;
  forceSequential: boolean;
  anchor?: Anchor;
  scenes: SceneResult[];
  retryCount: number;
  cacheHit: boolean;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface SceneResult {
  sceneNumber: SceneNumber;
  sceneType: SceneType;
  status: 'pending' | 'success' | 'failed';
  videoUrl?: string;
  videoBuffer?: Buffer;
  keyframeUrl?: string;
  script?: SceneScript;
  retryCount: number;
  error?: string;
  generatedAt?: string;
}

export interface SceneScript {
  sceneNumber: SceneNumber;
  sceneType: SceneType;
  narration: string;
  characterDialogue?: string;
  characterName?: string;
  visualDescription: string;
  keyframePrompt: string;
  videoPrompt: string;
  duration: 8;
}

export interface Anchor {
  jobId: string;
  title: string;
  styleSignature: StyleSignature;
  typographyPlan: TypographyPlan;
  storyboard: StoryboardPlan;
  safetyConstraints: SafetyConstraints;
  createdAt: string;
}

export interface StyleSignature {
  visualStyle: string; // "cute 3D animation" | "soft 2D Ghibli style"
  colorPalette: string[]; // HEX colors
  mood: string; // "warm, friendly, magical"
  cameraLanguage: string; // "smooth tracking, gentle zoom"
  genre: string; // "children's fantasy"
  consistencyHash: string; // SHA256 of style params
}

export interface TypographyPlan {
  subtitleRegion: {
    position: 'bottom';
    safeMargin: number; // pixels from bottom
    maxLines: number;
    maxCharsPerLine: number;
    fontSize: number;
  };
  titleRegion: {
    position: 'center' | 'top';
    displayDuration: number; // seconds
    fontSize: number;
  };
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  outlineColor: string;
}

export interface StoryboardPlan {
  scenes: SceneStoryboard[];
}

export interface SceneStoryboard {
  sceneNumber: SceneNumber;
  sceneType: SceneType;
  timeRange: [number, number]; // [start, end] in seconds
  keyframes: Keyframe[];
  objective: string; // "hook the viewer" | "reveal story" | "call to action"
  visualFocus: string; // "book cover" | "main character" | "library setting"
}

export interface Keyframe {
  timestamp: number; // 0, 2, 5, or 8
  description: string;
  action: string;
}

export interface SafetyConstraints {
  forbiddenThemes: string[];
  forbiddenWords: string[];
  requiredTone: string; // "positive, uplifting"
  targetAudience: string; // "children ages 5-12"
}

export interface QCReport {
  jobId: string;
  overall: QCStatus;
  overallScore: number; // 0-1
  typography: TypographyQCResult;
  consistency: ConsistencyQCResult;
  safety: SafetyQCResult;
  scoring: VideoScoreResult;
  timestamp: string;
}

export interface TypographyQCResult {
  status: QCStatus;
  score: number;
  checks: {
    subtitleLength: boolean;
    subtitlePosition: boolean;
    fontSizeCompliance: boolean;
    contrastRatio: boolean;
  };
  violations: string[];
}

export interface ConsistencyQCResult {
  status: QCStatus;
  score: number;
  anchorMatch: number; // 0-1, how well scenes match anchor
  sceneToSceneConsistency: number; // 0-1
  colorPaletteDrift: number; // 0-1, lower is better
  styleSignatureMatch: boolean;
  violations: string[];
}

export interface SafetyQCResult {
  status: QCStatus;
  score: number; // 1.0 = pass, < 1.0 = fail
  forbiddenWordsFound: string[];
  themeViolations: string[];
  toneScore: number; // 0-1, positive sentiment
  visualSafetyFlags: string[];
}

export interface VideoScoreResult {
  status: QCStatus;
  overallScore: number;
  componentScores: {
    typography: number;
    consistency: number;
    safety: number;
    technical: number;
  };
  passedThreshold: boolean;
}

export interface CostReport {
  jobId: string;
  breakdown: {
    anchorGeneration: number;
    scriptGeneration: number;
    keyframeGeneration: number;
    videoGeneration: number;
    retries: number;
    total: number;
  };
  apiCalls: {
    gemini: number;
    imagen: number;
    veo: number;
  };
  retryBreakdown: {
    scene1: number;
    scene2: number;
    scene3: number;
  };
  elapsedTimeMs: number;
  cacheHit: boolean;
  timestamp: string;
}

export interface VideoGenerationResult {
  jobId: string;
  status: JobStatus;
  videoUrl?: string;
  subtitleUrl?: string;
  qcReport?: QCReport;
  costReport?: CostReport;
  cacheHit: boolean;
  mode: GenerationMode;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// Provider interfaces
export interface GeminiProvider {
  generateAnchor(title: string, language: string): Promise<Anchor>;
  generateSceneScript(anchor: Anchor, sceneType: SceneType): Promise<SceneScript>;
  generateKeyframe(prompt: string): Promise<Buffer>;
  generateVideo(keyframeBuffer: Buffer, prompt: string, duration: 8): Promise<Buffer>;
}

// Storage interfaces
export interface StorageProvider {
  save(key: string, data: Buffer, metadata?: Record<string, any>): Promise<string>;
  load(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

// Cache interfaces
export interface CacheEntry {
  cacheKey: string;
  jobId: string;
  videoUrl: string;
  subtitleUrl: string;
  qcReport: QCReport;
  costReport: CostReport;
  requestCount: number;
  createdAt: string;
  expiresAt: string;
}

// ============================================
// V2 Types - Book Grounding & Style Bible
// ============================================

/**
 * A candidate book from Google Books API search
 */
export interface BookCandidate {
  id: string;
  title: string;
  authors: string[];
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  thumbnail?: string;
  infoLink?: string;
  averageRating?: number;
  ratingsCount?: number;
}

/**
 * Scoring result for ranking book candidates
 */
export interface BookCandidateScore {
  candidate: BookCandidate;
  score: number;
  matchDetails: {
    titleMatch: number;
    authorMatch: number;
    descriptionQuality: number;
    popularity: number;
  };
}

/**
 * Character information extracted from book
 */
export interface BookCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  appearance: string;
  personality?: string;
}

/**
 * Plot beat for story structure
 */
export interface PlotBeat {
  order: number;
  abstractEvent: string;
  emotionalTone: string;
}

/**
 * Verified book facts extracted from grounding process
 */
export interface BookFacts {
  canonicalTitle: string;
  author: string;
  logline: string;
  mainCharacters: BookCharacter[];
  plotBeats: PlotBeat[];
  setting?: string;
  themes?: string[];
  targetAudience?: string;
  sourceConfidence: number;
  sourceBookId: string;
}

/**
 * Art direction configuration
 */
export interface ArtDirection {
  artStyle: string;
  paletteKeywords: string[];
  lightingMood: string;
  cameraRules: string[];
}

/**
 * Visual anchors for consistent character/scene rendering
 */
export interface VisualAnchors {
  protagonistDesign: string;
  symbolicObject: string;
  primaryLocation: string;
}

/**
 * Style bible containing art direction and visual anchors
 */
export interface StyleBible {
  artDirection: ArtDirection;
  visualAnchors: VisualAnchors;
  forbiddenBrands: string[];
  artStylePrefix: string;
}

/**
 * V2 Scene script with shared anchors
 */
export interface SceneScriptV2 {
  sceneNumber: SceneNumber;
  sceneType: SceneType;
  sceneRole: 'hook' | 'journey' | 'promise';
  narration: string;
  visualDescription: string;
  keyframePrompt: string;
  videoPrompt: string;
  duration: 8;
  sharedAnchors: {
    protagonistDesign: string;
    primaryLocation: string;
    artStylePrefix: string;
  };
}

/**
 * Scene plan before full script generation
 */
export interface ScenePlan {
  sceneNumber: SceneNumber;
  sceneRole: 'hook' | 'journey' | 'promise';
  objective: string;
  emotionalTone: string;
  visualFocus: string;
  plotBeatReference?: number;
}

// ============================================
// V2 Types - Hierarchical Retry
// ============================================

export type RetryStage = 'script' | 'keyframe' | 'video';

/**
 * Retry state for a single scene
 */
export interface SceneRetryState {
  sceneNumber: SceneNumber;
  currentStage: RetryStage;
  scriptRetries: number;
  keyframeRetries: number;
  videoRetries: number;
  lastError?: string;
  script?: SceneScriptV2;
  keyframeBuffer?: Buffer;
  keyframeUrl?: string;
}

/**
 * Retry limits configuration
 */
export interface RetryLimits {
  script: number;
  keyframe: number;
  video: number;
}

/**
 * Full hierarchical retry state for a job
 */
export interface HierarchicalRetryState {
  jobId: string;
  scenes: SceneRetryState[];
  limits: RetryLimits;
  totalAttempts: number;
  maxTotalAttempts: number;
}

/**
 * Result of a retry attempt
 */
export interface RetryResult {
  success: boolean;
  stage: RetryStage;
  sceneNumber: SceneNumber;
  shouldContinue: boolean;
  nextStage?: RetryStage;
  error?: string;
}

// ============================================
// V2 Types - Orchestrator
// ============================================

/**
 * V2 Job configuration
 */
export interface VideoGenerationJobV2 extends Omit<VideoGenerationJob, 'anchor' | 'scenes'> {
  bookFacts?: BookFacts;
  styleBible?: StyleBible;
  scenePlans?: ScenePlan[];
  scenesV2: SceneResultV2[];
  retryState?: HierarchicalRetryState;
}

/**
 * V2 Scene result with retry info
 */
export interface SceneResultV2 {
  sceneNumber: SceneNumber;
  sceneType: SceneType;
  sceneRole: 'hook' | 'journey' | 'promise';
  status: 'pending' | 'success' | 'failed';
  videoUrl?: string;
  videoBuffer?: Buffer;
  keyframeUrl?: string;
  keyframeBuffer?: Buffer;
  script?: SceneScriptV2;
  retryState: SceneRetryState;
  generatedAt?: string;
}
