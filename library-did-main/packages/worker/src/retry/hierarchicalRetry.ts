/**
 * Hierarchical Retry Policy for V2 Pipeline
 *
 * Retry order: Script → Keyframe → Video
 * - Script fails: regenerate script only
 * - Keyframe fails: regenerate keyframe only (keep script)
 * - Video fails: regenerate video only (keep script + keyframe)
 *
 * This minimizes cost by not regenerating successful earlier stages.
 */

import {
  SceneNumber,
  RetryStage,
  SceneRetryState,
  RetryLimits,
  HierarchicalRetryState,
  RetryResult,
  SceneScriptV2,
} from '../shared/types';

// Default retry limits
const DEFAULT_LIMITS: RetryLimits = {
  script: 3,
  keyframe: 3,
  video: 2, // Lower because video generation is expensive
};

/**
 * Create initial hierarchical retry state for a job
 */
export function createRetryState(
  jobId: string,
  limits: Partial<RetryLimits> = {}
): HierarchicalRetryState {
  const finalLimits: RetryLimits = {
    ...DEFAULT_LIMITS,
    ...limits,
  };

  const scenes: SceneRetryState[] = [
    createSceneRetryState(1),
    createSceneRetryState(2),
    createSceneRetryState(3),
  ];

  return {
    jobId,
    scenes,
    limits: finalLimits,
    totalAttempts: 0,
    maxTotalAttempts: calculateMaxTotalAttempts(finalLimits),
  };
}

/**
 * Create initial retry state for a single scene
 */
function createSceneRetryState(sceneNumber: SceneNumber): SceneRetryState {
  return {
    sceneNumber,
    currentStage: 'script',
    scriptRetries: 0,
    keyframeRetries: 0,
    videoRetries: 0,
    lastError: undefined,
    script: undefined,
    keyframeBuffer: undefined,
    keyframeUrl: undefined,
  };
}

/**
 * Calculate maximum total attempts across all scenes and stages
 */
function calculateMaxTotalAttempts(limits: RetryLimits): number {
  // For each scene: script retries + keyframe retries + video retries
  const perScene = limits.script + limits.keyframe + limits.video;
  return perScene * 3; // 3 scenes
}

/**
 * Record a successful stage completion
 */
export function recordStageSuccess(
  state: HierarchicalRetryState,
  sceneNumber: SceneNumber,
  stage: RetryStage,
  data: {
    script?: SceneScriptV2;
    keyframeBuffer?: Buffer;
    keyframeUrl?: string;
  }
): HierarchicalRetryState {
  const sceneIndex = sceneNumber - 1;
  const scene = state.scenes[sceneIndex];

  const updatedScene: SceneRetryState = {
    ...scene,
    currentStage: getNextStage(stage),
    lastError: undefined,
  };

  // Store successful data
  if (stage === 'script' && data.script) {
    updatedScene.script = data.script;
  }
  if (stage === 'keyframe') {
    if (data.keyframeBuffer) updatedScene.keyframeBuffer = data.keyframeBuffer;
    if (data.keyframeUrl) updatedScene.keyframeUrl = data.keyframeUrl;
  }

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIndex] = updatedScene;

  return {
    ...state,
    scenes: updatedScenes,
  };
}

/**
 * Record a stage failure and determine retry strategy
 */
export function recordStageFailure(
  state: HierarchicalRetryState,
  sceneNumber: SceneNumber,
  stage: RetryStage,
  error: string
): { state: HierarchicalRetryState; result: RetryResult } {
  const sceneIndex = sceneNumber - 1;
  const scene = state.scenes[sceneIndex];

  let updatedScene: SceneRetryState = {
    ...scene,
    lastError: error,
  };

  // Increment retry count for the failed stage
  switch (stage) {
    case 'script':
      updatedScene.scriptRetries++;
      break;
    case 'keyframe':
      updatedScene.keyframeRetries++;
      break;
    case 'video':
      updatedScene.videoRetries++;
      break;
  }

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIndex] = updatedScene;

  const updatedState: HierarchicalRetryState = {
    ...state,
    scenes: updatedScenes,
    totalAttempts: state.totalAttempts + 1,
  };

  // Determine retry strategy
  const result = determineRetryStrategy(updatedState, sceneNumber, stage);

  return { state: updatedState, result };
}

/**
 * Determine the retry strategy after a failure
 */
function determineRetryStrategy(
  state: HierarchicalRetryState,
  sceneNumber: SceneNumber,
  failedStage: RetryStage
): RetryResult {
  const scene = state.scenes[sceneNumber - 1];
  const limits = state.limits;

  // Check if we've exhausted retries for this stage
  const retriesExhausted = isStageExhausted(scene, failedStage, limits);

  if (retriesExhausted) {
    // Can we fall back to retry an earlier stage?
    const fallbackStage = getFallbackStage(scene, failedStage, limits);

    if (fallbackStage) {
      console.log(
        `[Retry] Scene ${sceneNumber}: ${failedStage} exhausted, falling back to ${fallbackStage}`
      );
      return {
        success: false,
        stage: failedStage,
        sceneNumber,
        shouldContinue: true,
        nextStage: fallbackStage,
        error: `${failedStage} exhausted, retrying from ${fallbackStage}`,
      };
    }

    // All retries exhausted
    console.log(`[Retry] Scene ${sceneNumber}: All retries exhausted`);
    return {
      success: false,
      stage: failedStage,
      sceneNumber,
      shouldContinue: false,
      error: `All retries exhausted for scene ${sceneNumber}`,
    };
  }

  // Retry the same stage
  console.log(
    `[Retry] Scene ${sceneNumber}: Retrying ${failedStage} (attempt ${getRetryCount(scene, failedStage) + 1}/${getLimit(limits, failedStage)})`
  );
  return {
    success: false,
    stage: failedStage,
    sceneNumber,
    shouldContinue: true,
    nextStage: failedStage,
  };
}

/**
 * Check if a stage has exhausted its retries
 */
function isStageExhausted(
  scene: SceneRetryState,
  stage: RetryStage,
  limits: RetryLimits
): boolean {
  switch (stage) {
    case 'script':
      return scene.scriptRetries >= limits.script;
    case 'keyframe':
      return scene.keyframeRetries >= limits.keyframe;
    case 'video':
      return scene.videoRetries >= limits.video;
  }
}

/**
 * Get the retry count for a stage
 */
function getRetryCount(scene: SceneRetryState, stage: RetryStage): number {
  switch (stage) {
    case 'script':
      return scene.scriptRetries;
    case 'keyframe':
      return scene.keyframeRetries;
    case 'video':
      return scene.videoRetries;
  }
}

/**
 * Get the limit for a stage
 */
function getLimit(limits: RetryLimits, stage: RetryStage): number {
  return limits[stage];
}

/**
 * Get the next stage after a successful completion
 */
function getNextStage(currentStage: RetryStage): RetryStage {
  switch (currentStage) {
    case 'script':
      return 'keyframe';
    case 'keyframe':
      return 'video';
    case 'video':
      return 'video'; // Video is final stage
  }
}

/**
 * Get fallback stage when current stage is exhausted
 * Returns null if no fallback is available
 */
function getFallbackStage(
  scene: SceneRetryState,
  currentStage: RetryStage,
  limits: RetryLimits
): RetryStage | null {
  // Video can fall back to keyframe, keyframe can fall back to script
  switch (currentStage) {
    case 'video':
      if (scene.keyframeRetries < limits.keyframe) {
        return 'keyframe';
      }
      if (scene.scriptRetries < limits.script) {
        return 'script';
      }
      return null;

    case 'keyframe':
      if (scene.scriptRetries < limits.script) {
        return 'script';
      }
      return null;

    case 'script':
      return null; // Script is the first stage, no fallback
  }
}

/**
 * Check if all scenes have completed successfully
 */
export function isJobComplete(state: HierarchicalRetryState): boolean {
  return state.scenes.every((scene) => isSceneComplete(scene));
}

/**
 * Check if a single scene has completed all stages
 */
function isSceneComplete(scene: SceneRetryState): boolean {
  return (
    scene.script !== undefined &&
    (scene.keyframeBuffer !== undefined || scene.keyframeUrl !== undefined) &&
    scene.currentStage === 'video' &&
    !scene.lastError
  );
}

/**
 * Check if job has failed (exhausted all retries without success)
 */
export function isJobFailed(state: HierarchicalRetryState): boolean {
  return state.scenes.some((scene) => {
    const scriptExhausted = scene.scriptRetries >= state.limits.script;
    const keyframeExhausted = scene.keyframeRetries >= state.limits.keyframe;
    const videoExhausted = scene.videoRetries >= state.limits.video;

    // Scene has failed if all stages are exhausted and it's not complete
    return scriptExhausted && keyframeExhausted && videoExhausted && !isSceneComplete(scene);
  });
}

/**
 * Get scenes that need processing
 */
export function getScenesNeedingWork(state: HierarchicalRetryState): SceneRetryState[] {
  return state.scenes.filter((scene) => !isSceneComplete(scene) && !isSceneExhausted(scene, state.limits));
}

/**
 * Check if a scene has exhausted all retries
 */
function isSceneExhausted(scene: SceneRetryState, limits: RetryLimits): boolean {
  return (
    scene.scriptRetries >= limits.script &&
    scene.keyframeRetries >= limits.keyframe &&
    scene.videoRetries >= limits.video
  );
}

/**
 * Get a summary of the retry state for logging
 */
export function getRetryStateSummary(state: HierarchicalRetryState): string {
  const sceneSummaries = state.scenes.map((scene) => {
    const status = isSceneComplete(scene)
      ? '✅'
      : scene.lastError
      ? '❌'
      : '⏳';
    const retries = `S:${scene.scriptRetries} K:${scene.keyframeRetries} V:${scene.videoRetries}`;
    return `Scene ${scene.sceneNumber} ${status} (${retries})`;
  });

  return [
    `Total attempts: ${state.totalAttempts}/${state.maxTotalAttempts}`,
    ...sceneSummaries,
  ].join(' | ');
}

/**
 * Reset a scene's keyframe and video state for re-generation from script
 */
export function resetSceneFromScript(
  state: HierarchicalRetryState,
  sceneNumber: SceneNumber
): HierarchicalRetryState {
  const sceneIndex = sceneNumber - 1;
  const scene = state.scenes[sceneIndex];

  const updatedScene: SceneRetryState = {
    ...scene,
    currentStage: 'script',
    script: undefined,
    keyframeBuffer: undefined,
    keyframeUrl: undefined,
    lastError: undefined,
  };

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIndex] = updatedScene;

  return {
    ...state,
    scenes: updatedScenes,
  };
}

/**
 * Reset a scene's video state for re-generation from keyframe
 */
export function resetSceneFromKeyframe(
  state: HierarchicalRetryState,
  sceneNumber: SceneNumber
): HierarchicalRetryState {
  const sceneIndex = sceneNumber - 1;
  const scene = state.scenes[sceneIndex];

  const updatedScene: SceneRetryState = {
    ...scene,
    currentStage: 'keyframe',
    keyframeBuffer: undefined,
    keyframeUrl: undefined,
    lastError: undefined,
  };

  const updatedScenes = [...state.scenes];
  updatedScenes[sceneIndex] = updatedScene;

  return {
    ...state,
    scenes: updatedScenes,
  };
}
