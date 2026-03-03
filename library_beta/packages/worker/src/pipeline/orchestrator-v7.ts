/**
 * Pipeline Orchestrator V7 — 12s Short Trailer
 *
 * V7-Short (3×4s = 11초):
 *   Scene 1 (atmosphere): world+character 압축
 *   Scene 2 (story):      story
 *   Scene 3 (emotion):    message+title 압축
 *
 * Pipeline: Grounding → Style Bible → V4 Scripts → Sora Prompts → Sora Video → FFmpeg Assembly → Storage
 */

import path from 'path';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, VIDEO_CONFIG_V7 } from '../config';
import { logger } from '../config/logger';
import { BookFacts, StyleBible, VideoGenerationRequest } from '../shared/types';
import { V4ScriptResult } from '../types/v7';

import { groundBook } from './grounding';
import { buildStyleBible } from './style/styleBible';
import { generateV4Scripts } from './planning/scenePlannerV4';
import * as memory from '../evolution/memory';
import { SoraClient } from '../services/sora-client';
import { getStorageProvider } from '../services/storage-provider.factory';
import { ffmpegExec, escapeRegex } from '../utils/security';

// ── Types ──
type DurationMode = 12 | 20;

interface V7PipelineResult {
  jobId: string;
  status: 'completed' | 'failed';
  videoUrl?: string;
  subtitleUrl?: string;
  error?: string;
  cacheHit: boolean;
  mode: string;
  createdAt: string;
  completedAt?: string;
}

// ── Camera moves per scene role (Cookbook style) ──
const CAMERA_BY_ROLE: Record<string, { camera: string; spaceHint: string; intent: string }> = {
  world:      { camera: 'Slow dolly forward, gentle push-in revealing depth and scale.', spaceHint: 'Bottom 20% of frame kept relatively clean.', intent: 'Establish the world.' },
  atmosphere: { camera: 'Slow dolly forward, gentle push-in revealing depth and scale.', spaceHint: 'Bottom 20% of frame kept relatively clean.', intent: 'Establish the world.' },
  character:  { camera: 'Warm light intensifies, storybook depth layers emerge.', spaceHint: 'Bottom third of frame kept clean.', intent: 'Introduce protagonist.' },
  story:      { camera: 'Gentle pan left to right, slight zoom toward focal point.', spaceHint: 'Center of frame kept uncluttered.', intent: 'Show emotional core.' },
  message:    { camera: 'Soft dreamy movement, golden hour light, gentle bokeh particles.', spaceHint: 'Center of frame kept clean.', intent: 'Most emotional scene.' },
  emotion:    { camera: 'Slow pull-back or gentle upward drift. Warm light fills frame. Bokeh particles.', spaceHint: 'Center and bottom third kept clean.', intent: 'Warm closure.' },
  title:      { camera: 'Slow pull-back or upward drift, light floods frame. Bokeh particles.', spaceHint: 'Bottom third of frame kept clean.', intent: 'Brightest, most hopeful.' },
};

// ── Overlay timings for 12s mode ──
const V7_OVERLAY_12 = {
  disclaimer: {
    start: 0.5, end: 3.0, fadeIn: 0.5, fadeOut: 0.5,
    fontSize: 18, yRatio1: 0.88, yRatio2: 0.93,
    line1: 'AI가 만든 도서 소개 영상입니다.',
    line2: '실제 책의 그림과 다를 수 있어요.',
  },
  bookMeta: { start: 1.5, end: 3.5, fadeIn: 0.4, fadeOut: 0.4, fontSize: 24, yRatio: 0.78 },
  storyLine: { start: 4.2, end: 6.8, fadeIn: 0.4, fadeOut: 0.4, fontSize: 28, yRatio: 0.45 },
  trailerTitle: { start: 7.3, end: 9.2, fadeIn: 0.4, fadeOut: 0.4, fontSize: 34, yRatio: 0.42 },
  bookTitle: {
    titleStart: 9.0, authorStart: 9.3, end: 10.8,
    fadeIn: 0.5, titleFontSize: 36, authorFontSize: 20,
    titleYRatio: 0.72, authorYRatio: 0.82,
  },
};

const FONTS = VIDEO_CONFIG_V7.fonts;
const XF = VIDEO_CONFIG_V7.crossfadeDuration;

// ── FFmpeg helpers ──
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\\\\\').replace(/'/g, "'\\\\\\''").replace(/:/g, '\\\\:').replace(/%/g, '%%');
}
function fadeAlpha(s: number, e: number, fi: number, fo: number): string {
  if (fo === 0) return `if(lt(t\\,${s + fi})\\,(t-${s})/${fi}\\,1)`;
  return `if(lt(t\\,${s + fi})\\,(t-${s})/${fi}\\,if(gt(t\\,${e - fo})\\,(${e}-t)/${fo}\\,1))`;
}
function splitText(text: string, maxLines: number): string[] {
  if (text.includes('\n')) return text.split('\n').slice(0, maxLines);
  const dotIdx = text.indexOf('. ');
  if (dotIdx > 0 && dotIdx < text.length - 2) return [text.substring(0, dotIdx + 1), text.substring(dotIdx + 2)];
  if (text.length <= 20 || maxLines === 1) return [text];
  const mid = Math.floor(text.length / 2);
  const sp = text.indexOf(' ', mid);
  const sb = text.lastIndexOf(' ', mid);
  const at = sp !== -1 ? sp : sb !== -1 ? sb : mid;
  return [text.substring(0, at), text.substring(at + 1)];
}

function sanitize(prompt: string, charNames: string[]): string {
  let p = prompt;
  for (const name of charNames) p = p.replace(new RegExp(escapeRegex(name), 'gi'), 'a lone object');
  return p
    .replace(/Little Prince/gi, 'a small golden scarf')
    .replace(/어린 ?왕자/g, 'a small golden scarf')
    .replace(/\b(person|boy|girl|child|children|kid|baby|prince|princess)\b/gi, 'a warm glow')
    .replace(/\b(face|eyes|smile|mouth|hands?|fingers?|arms?|legs?|feet|body|bodies)\b/gi, 'gentle light')
    .replace(/3D|CGI|render(ed)?|digital|photorealistic/gi, '')
    .replace(/Pixar|Disney|Ghibli|Dreamworks/gi, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * V7 Pipeline Orchestrator
 */
export class PipelineOrchestratorV7 {
  async execute(request: VideoGenerationRequest & { bookId?: string }): Promise<V7PipelineResult> {
    const startTime = Date.now();
    const jobId = `job_v7_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const duration: DurationMode = 12;
    const durConfig = VIDEO_CONFIG_V7.modes[duration];
    const sceneCount = durConfig.sceneCount;
    const overlay = V7_OVERLAY_12;

    logger.info(`[V7] Starting job ${jobId} for "${request.title}"`);

    const ts = new Date();
    const dateStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(ts.getHours()).padStart(2, '0')}-${String(ts.getMinutes()).padStart(2, '0')}`;
    const runId = `${dateStr}_${timeStr}_${Math.random().toString(36).substring(2, 8)}`;
    const tempDir = path.join(config.tempDir, runId);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      // ═══════ STEP 1: Book Grounding ═══════
      logger.info('[V7] Step 1: Book Grounding');
      const groundingResult = await groundBook(request.title, request.author);
      if (!groundingResult) {
        return this.fail(jobId, `Book not found: "${request.title}"`);
      }
      const { bookFacts } = groundingResult;
      logger.info(`[V7] ✅ ${bookFacts.canonicalTitle} (${bookFacts.author})`);

      const genre = bookFacts.themes?.[0] || '일반';
      const charNames = bookFacts.mainCharacters.map((c) => c.name);

      // ═══════ STEP 2: Style Bible ═══════
      logger.info('[V7] Step 2: Style Bible');
      const styleBible = await buildStyleBible(bookFacts);
      logger.info(`[V7] ✅ Art: ${styleBible.artDirection.artStyle.substring(0, 50)}...`);

      // ═══════ STEP 3: V4 Scripts ═══════
      logger.info('[V7] Step 3: V4 Scripts (5요소 → 3씬)');
      const pastLessons = await memory.getSummaryForPrompt(genre);
      const scriptResult = await generateV4Scripts(bookFacts, styleBible, pastLessons || undefined);
      const { scenes, storyLine, tagline, bookMeta } = scriptResult;

      // 5장면 → 3씬 압축 (12s mode)
      interface V7Scene { role: string; desc: string }
      const v7Scenes: V7Scene[] = [
        { role: 'atmosphere', desc: `${scenes[0].visualDescription} ${scenes[1].visualDescription}` },
        { role: 'story', desc: scenes[2].visualDescription },
        { role: 'emotion', desc: `${scenes[3].visualDescription} ${scenes[4].visualDescription}` },
      ];

      logger.info(`[V7] ✅ StoryLine: "${storyLine}"`);
      logger.info(`[V7] ✅ Tagline: "${tagline.text}"`);

      // ═══════ STEP 4: Sora Prompts (Cookbook) ═══════
      logger.info('[V7] Step 4: Sora Prompts');
      const soraPrompts = await this.generateSoraPrompts(v7Scenes, styleBible, charNames, sceneCount);

      // ═══════ STEP 5: Sora Video Generation ═══════
      logger.info('[V7] Step 5: Sora Video Generation');
      if (!config.openaiApiKey) {
        return this.fail(jobId, 'OPENAI_API_KEY required for Sora');
      }

      const soraClient = new SoraClient(config.openaiApiKey);
      const videoPaths: string[] = [];

      for (let i = 0; i < sceneCount; i++) {
        logger.info(`[V7] Scene ${i + 1}/${sceneCount} (${v7Scenes[i].role})...`);
        const result = await soraClient.generateVideo({
          prompt: soraPrompts[i],
          duration: 4,
          aspectRatio: '16:9',
        });

        if (result.success && result.videoBuffer) {
          const vPath = path.join(tempDir, `scene-${i + 1}.mp4`);
          await fs.writeFile(vPath, result.videoBuffer);
          videoPaths.push(vPath);
          logger.info(`[V7] ✅ Scene ${i + 1} complete`);
        } else {
          logger.error(`[V7] ❌ Scene ${i + 1} failed: ${result.error}`);
          return this.fail(jobId, `Scene ${i + 1} generation failed: ${result.error}`);
        }

        if (i < sceneCount - 1) {
          await delay(15000); // Rate limit
        }
      }

      // ═══════ STEP 6: FFmpeg Assembly ═══════
      logger.info('[V7] Step 6: Assembly (Crossfade + Overlay)');
      const finalPath = await this.assembleVideo(
        videoPaths, tempDir, bookFacts, storyLine, tagline, bookMeta, overlay, durConfig
      );

      // ═══════ STEP 7: Save to Storage ═══════
      logger.info('[V7] Step 7: Save to Storage');
      let videoUrl = `output/videos/${jobId}.mp4`;
      const bookId = request.bookId;

      if (bookId && finalPath) {
        try {
          const videoBuffer = await fs.readFile(finalPath);
          const storage = getStorageProvider();
          const timestamp = Date.now();
          const videoKey = `${bookId}-${timestamp}.mp4`;
          const savedUrl = await storage.save(videoKey, videoBuffer);
          videoUrl = savedUrl.startsWith('/videos/') ? '/api' + savedUrl : savedUrl;
          logger.info(`[V7] ✅ Video saved: ${videoUrl}`);
        } catch (err: any) {
          logger.error(`[V7] ⚠️ Storage save failed: ${err.message}`);
        }
      }

      // Cleanup temp
      try { await fs.rm(tempDir, { recursive: true, force: true }); } catch {}

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`[V7] ✅ Job ${jobId} COMPLETED in ${elapsed}s`);

      return {
        jobId,
        status: 'completed',
        videoUrl,
        cacheHit: false,
        mode: 'v7-short-12s',
        createdAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`[V7] ❌ Job ${jobId} FAILED: ${error.message}`);
      try { await fs.rm(tempDir, { recursive: true, force: true }); } catch {}
      return this.fail(jobId, error.message);
    }
  }

  /**
   * Generate Sora prompts using Gemini (Cookbook structure)
   */
  private async generateSoraPrompts(
    v7Scenes: { role: string; desc: string }[],
    styleBible: StyleBible,
    charNames: string[],
    sceneCount: number
  ): Promise<string[]> {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const palette = styleBible.artDirection.paletteKeywords.slice(0, 5).join(', ');
    const artStyle = styleBible.artStylePrefix || 'Hand-painted watercolor storybook illustration, soft edges, warm golden undertones, visible paper texture';
    const lightingMood = styleBible.artDirection.lightingMood || 'warm golden hour glow, soft diffused light';

    const soraPrompts: string[] = [];
    for (let i = 0; i < sceneCount; i++) {
      const scene = v7Scenes[i];
      const cam = CAMERA_BY_ROLE[scene.role] || CAMERA_BY_ROLE['story'];
      const continuity = i > 0 ? 'Maintain same color temperature and art style as previous shot.' : '';

      const convPrompt = `Convert this scene description into a 4-second Sora text-to-video prompt:
STYLE: "${artStyle}, ${palette} palette, ${lightingMood}"
SCENE: ${scene.desc}
CAMERA: ${cam.camera}
COMPOSITION: ${cam.spaceHint}
${continuity ? `CONTINUITY: ${continuity}` : ''}

RULES:
- 50-80 words total. ONE camera movement. ONE visual action.
- Start with STYLE line. ONLY landscapes/environments/objects.
- NO people/figures/silhouettes/characters/faces/bodies.
- Include: "hand-painted watercolor", "storybook illustration".
- End with: "No text on screen."
- NEVER use: 3D, CGI, Pixar, Disney, Ghibli.

Write ONLY the Sora prompt (50-80 words, English):`;

      try {
        const result = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: convPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 150 },
        });
        let prompt = result.response.text().trim().replace(/^["']|["']$/g, '');
        prompt = sanitize(prompt, charNames);
        if (!prompt.toLowerCase().includes('no text')) prompt += ' No text on screen.';
        if (prompt.length > 400) prompt = prompt.substring(0, 397) + '...';
        soraPrompts.push(prompt);
      } catch {
        const fallback = `${artStyle}, ${palette} palette. Dreamy landscape, ${lightingMood}. ${cam.camera} No text on screen.`;
        soraPrompts.push(fallback);
      }
    }
    return soraPrompts;
  }

  /**
   * FFmpeg Assembly: Crossfade + Overlays + Fade
   */
  private async assembleVideo(
    videoPaths: string[],
    tempDir: string,
    bookFacts: BookFacts,
    storyLine: string,
    tagline: { text: string; emotion: string },
    bookMeta: { genre: string; ageGroup: string },
    overlay: typeof V7_OVERLAY_12,
    durConfig: typeof VIDEO_CONFIG_V7.modes[12]
  ): Promise<string> {
    const sceneCount = videoPaths.length;
    const offsets = durConfig.xfadeOffsets;

    // 1. Crossfade
    const crossfadedPath = path.join(tempDir, 'crossfaded.mp4');
    const normalizeFilters = videoPaths.map((_, i) => `[${i}:v]fps=30,format=yuv420p,settb=AVTB[n${i}]`).join('; ');
    const xfadeChain =
      `[n0][n1]xfade=transition=dissolve:duration=${XF}:offset=${offsets[0]}[v01]; ` +
      `[v01][n2]xfade=transition=dissolve:duration=${XF}:offset=${offsets[1]}[vout]`;

    const xfadeArgs: string[] = [];
    for (const p of videoPaths) { xfadeArgs.push('-i', p); }
    xfadeArgs.push('-filter_complex', `${normalizeFilters}; ${xfadeChain}`);
    xfadeArgs.push('-map', '[vout]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-y', crossfadedPath);

    logger.info('[V7] Crossfade (dissolve)...');
    await ffmpegExec(xfadeArgs);

    // 2. Overlays
    const filters: string[] = [];

    // Disclaimer
    const dc = overlay.disclaimer;
    filters.push(
      `drawtext=text='${esc(dc.line1)}':fontfile=${FONTS.medium}:fontsize=${dc.fontSize}:fontcolor=#B0B0B0` +
      `:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=(w-text_w)/2:y=h*${dc.yRatio1}` +
      `:enable='between(t\\,${dc.start}\\,${dc.end})':alpha='${fadeAlpha(dc.start, dc.end, dc.fadeIn, dc.fadeOut)}'`
    );
    filters.push(
      `drawtext=text='${esc(dc.line2)}':fontfile=${FONTS.medium}:fontsize=${dc.fontSize}:fontcolor=#B0B0B0` +
      `:shadowcolor=black@0.3:shadowx=1:shadowy=1:x=(w-text_w)/2:y=h*${dc.yRatio2}` +
      `:enable='between(t\\,${dc.start}\\,${dc.end})':alpha='${fadeAlpha(dc.start, dc.end, dc.fadeIn, dc.fadeOut)}'`
    );

    // Book meta
    const metaText = `${bookMeta.genre} · ${bookMeta.ageGroup}`;
    const bm = overlay.bookMeta;
    filters.push(
      `drawtext=text='${esc(metaText)}':fontfile=${FONTS.medium}:fontsize=${bm.fontSize}:fontcolor=#E0E0E0` +
      `:shadowcolor=black@0.5:shadowx=1:shadowy=1:x=(w-text_w)/2:y=h*${bm.yRatio}` +
      `:enable='between(t\\,${bm.start}\\,${bm.end})':alpha='${fadeAlpha(bm.start, bm.end, bm.fadeIn, bm.fadeOut)}'`
    );

    // StoryLine
    const sl = overlay.storyLine;
    const storyLines = splitText(storyLine, 2);
    const slGap = 10;
    const slTotalH = storyLines.length * sl.fontSize + (storyLines.length - 1) * slGap;
    storyLines.forEach((line, idx) => {
      const yOff = Math.round(-slTotalH / 2 + idx * (sl.fontSize + slGap));
      filters.push(
        `drawtext=text='${esc(line)}':fontfile=${FONTS.bold}:fontsize=${sl.fontSize}:fontcolor=white` +
        `:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h*${sl.yRatio})+(${yOff})` +
        `:enable='between(t\\,${sl.start}\\,${sl.end})':alpha='${fadeAlpha(sl.start, sl.end, sl.fadeIn, sl.fadeOut)}'`
      );
    });

    // Tagline
    const tt = overlay.trailerTitle;
    const ttLines = splitText(tagline.text, 2);
    const ttGap = 12;
    const ttTotalH = ttLines.length * tt.fontSize + (ttLines.length - 1) * ttGap;
    ttLines.forEach((line, idx) => {
      const yOff = Math.round(-ttTotalH / 2 + idx * (tt.fontSize + ttGap));
      filters.push(
        `drawtext=text='${esc(line)}':fontfile=${FONTS.bold}:fontsize=${tt.fontSize}:fontcolor=white` +
        `:shadowcolor=black@0.8:shadowx=3:shadowy=3:x=(w-text_w)/2:y=(h*${tt.yRatio})+(${yOff})` +
        `:enable='between(t\\,${tt.start}\\,${tt.end})':alpha='${fadeAlpha(tt.start, tt.end, tt.fadeIn, tt.fadeOut)}'`
      );
    });

    // Book title + author
    const bt = overlay.bookTitle;
    filters.push(
      `drawtext=text='${esc(bookFacts.canonicalTitle)}':fontfile=${FONTS.bold}:fontsize=${bt.titleFontSize}:fontcolor=white` +
      `:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*${bt.titleYRatio}` +
      `:enable='between(t\\,${bt.titleStart}\\,${bt.end})':alpha='${fadeAlpha(bt.titleStart, bt.end, bt.fadeIn, 0)}'`
    );
    filters.push(
      `drawtext=text='${esc(bookFacts.author)}':fontfile=${FONTS.medium}:fontsize=${bt.authorFontSize}:fontcolor=#CCCCCC` +
      `:shadowcolor=black@0.4:shadowx=1:shadowy=1:x=(w-text_w)/2:y=h*${bt.authorYRatio}` +
      `:enable='between(t\\,${bt.authorStart}\\,${bt.end})':alpha='${fadeAlpha(bt.authorStart, bt.end, bt.fadeIn + 0.3, 0)}'`
    );

    // Fade in/out
    filters.push('fade=t=in:st=0:d=0.3');
    filters.push(`fade=t=out:st=${durConfig.fadeOutStart}:d=0.5`);

    const finalPath = path.join(tempDir, 'final.mp4');
    await ffmpegExec(['-i', crossfadedPath, '-vf', filters.join(','), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-y', finalPath]);

    logger.info('[V7] ✅ Assembly complete');
    return finalPath;
  }

  private fail(jobId: string, error: string): V7PipelineResult {
    return {
      jobId,
      status: 'failed',
      error,
      cacheHit: false,
      mode: 'v7-short-12s',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }
}
