/**
 * V7 Types - Ported from trailer-engine shared types
 */

export interface SharedAnchorsV3 {
  protagonistDesign: string;
  primaryLocation: string;
  artStylePrefix: string;
  colorPalette: string;
  lightingMood: string;
}

export type SceneRoleV4 = 'world' | 'character' | 'story' | 'message' | 'title';
export type OverlayStyleV4 = 'none' | 'book-meta' | 'story-line' | 'trailer-title' | 'book-title';

export interface SceneScriptV4 {
  sceneNumber: 1 | 2 | 3 | 4 | 5;
  role: SceneRoleV4;
  visualDescription: string;
  videoPrompt: string;
  keyframePrompt: string;
  overlayText?: string;
  overlaySubText?: string;
  overlayStyle: OverlayStyleV4;
  sharedAnchors: SharedAnchorsV3;
  duration: 4;
}

export interface TrailerTagline {
  text: string;
  emotion: string;
}

export interface BookMeta {
  genre: string;
  ageGroup: string;
  publisher?: string;
}

export interface V4ScriptResult {
  scenes: SceneScriptV4[];
  storyLine: string;
  tagline: TrailerTagline;
  bookMeta: BookMeta;
}
