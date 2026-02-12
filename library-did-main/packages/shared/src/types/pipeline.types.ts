/**
 * Pipeline / QC / Retry / V2 공통 타입 (trailer-engine shared types 병합)
 * lib-mvp video.types.VideoStatus 등과 충돌 방지를 위해 pipeline 전용으로 분리
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
  /** bookId for saving video and callback (worker MVP) */
  bookId?: string;
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
  visualStyle: string;
  colorPalette: string[];
  mood: string;
  cameraLanguage: string;
  genre: string;
  consistencyHash: string;
}

export interface TypographyPlan {
  subtitleRegion: {
    position: 'bottom';
    safeMargin: number;
    maxLines: number;
    maxCharsPerLine: number;
    fontSize: number;
  };
  titleRegion: {
    position: 'center' | 'top';
    displayDuration: number;
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
  timeRange: [number, number];
  keyframes: Keyframe[];
  objective: string;
  visualFocus: string;
}

export interface Keyframe {
  timestamp: number;
  description: string;
  action: string;
}

export interface SafetyConstraints {
  forbiddenThemes: string[];
  forbiddenWords: string[];
  requiredTone: string;
  targetAudience: string;
}

export interface QCReport {
  jobId: string;
  overall: QCStatus;
  overallScore: number;
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
  anchorMatch: number;
  sceneToSceneConsistency: number;
  colorPaletteDrift: number;
  styleSignatureMatch: boolean;
  violations: string[];
}

export interface SafetyQCResult {
  status: QCStatus;
  score: number;
  forbiddenWordsFound: string[];
  themeViolations: string[];
  toneScore: number;
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

/** 파이프라인 작업 결과 (video.types.VideoGenerationResult와 구분) */
export interface PipelineJobResult {
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

export interface GeminiProvider {
  generateAnchor(title: string, language: string): Promise<Anchor>;
  generateSceneScript(anchor: Anchor, sceneType: SceneType): Promise<SceneScript>;
  generateKeyframe(prompt: string): Promise<Buffer>;
  generateVideo(keyframeBuffer: Buffer, prompt: string, duration: 8): Promise<Buffer>;
}

export interface StorageProvider {
  save(key: string, data: Buffer, metadata?: Record<string, unknown>): Promise<string>;
  load(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

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

// V2 - Book Grounding & Style Bible
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

export interface BookCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  appearance: string;
  personality?: string;
}

export interface PlotBeat {
  order: number;
  abstractEvent: string;
  emotionalTone: string;
}

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

export interface ArtDirection {
  artStyle: string;
  paletteKeywords: string[];
  lightingMood: string;
  cameraRules: string[];
}

export interface VisualAnchors {
  protagonistDesign: string;
  symbolicObject: string;
  primaryLocation: string;
}

export interface StyleBible {
  artDirection: ArtDirection;
  visualAnchors: VisualAnchors;
  forbiddenBrands: string[];
  artStylePrefix: string;
}

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

export interface ScenePlan {
  sceneNumber: SceneNumber;
  sceneRole: 'hook' | 'journey' | 'promise';
  objective: string;
  emotionalTone: string;
  visualFocus: string;
  plotBeatReference?: number;
}

export type RetryStage = 'script' | 'keyframe' | 'video';

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

export interface RetryLimits {
  script: number;
  keyframe: number;
  video: number;
}

export interface HierarchicalRetryState {
  jobId: string;
  scenes: SceneRetryState[];
  limits: RetryLimits;
  totalAttempts: number;
  maxTotalAttempts: number;
}

export interface RetryResult {
  success: boolean;
  stage: RetryStage;
  sceneNumber: SceneNumber;
  shouldContinue: boolean;
  nextStage?: RetryStage;
  error?: string;
}

export interface VideoGenerationJobV2 extends Omit<VideoGenerationJob, 'anchor' | 'scenes'> {
  bookFacts?: BookFacts;
  styleBible?: StyleBible;
  scenePlans?: ScenePlan[];
  scenesV2: SceneResultV2[];
  retryState?: HierarchicalRetryState;
}

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
