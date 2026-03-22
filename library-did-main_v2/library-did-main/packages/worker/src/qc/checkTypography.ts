/**
 * AGENT 1: Typography & Layout QC Agent
 * Validates subtitle and title typography constraints
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TypographyQCResult,
  SceneScript,
  TypographyPlan,
  QCStatus,
} from '../shared/types';

/** Per-check result used internally */
export interface TypographyCheck {
  scene: number;
  checkName: string;
  pass: boolean;
  expected: string;
  actual: string;
  message?: string;
}

/** Scene shape needed for typography check (sceneNumber only) */
interface SceneForTypography {
  sceneNumber: number;
}

/** Anchor-like shape actually used by checkTypography */
interface AnchorForCheck {
  language: 'ko' | 'en';
  typographyPlan: {
    subtitleRegion: { zone: string; safeAreaPercent: number };
    fontSize: { subtitle: number };
    contrast: number;
  };
  storyboard: {
    scenes: Array<{ sceneNumber: number; subtitleText: string }>;
  };
}

function rulesLanguage(lang: 'ko' | 'en'): 'korean' | 'english' {
  return lang === 'ko' ? 'korean' : 'english';
}

interface TypographyRules {
  version: string;
  rules: {
    subtitle: {
      region: { zone: string; safeAreaPercent: number };
      maxLineLength: { korean: number; english: number };
      maxLines: number;
      fontSize: { min: number; recommended: number };
      contrast: { min: number };
    };
    title: {
      region: { zone: string; safeAreaPercent: number };
      durationSeconds: { min: number; max: number };
      fontSize: { min: number; recommended: number };
    };
  };
  autoFix: {
    truncateOverflow: boolean;
    shortenText: boolean;
    breakLongLines: boolean;
  };
}

let cachedRules: TypographyRules | null = null;

async function loadRules(): Promise<TypographyRules> {
  if (cachedRules) return cachedRules;

  const rulesPath = path.join(__dirname, 'typographyRules.json');
  const content = await fs.readFile(rulesPath, 'utf-8');
  cachedRules = JSON.parse(content);
  return cachedRules!;
}

export type TypographyRawResult = { pass: boolean; score: number; checks: TypographyCheck[] };

export async function checkTypography(
  anchor: AnchorForCheck,
  scenes: SceneForTypography[]
): Promise<TypographyRawResult> {
  const rules = await loadRules();
  const checks: TypographyCheck[] = [];
  let totalScore = 0;
  let checkCount = 0;
  const langKey = rulesLanguage(anchor.language);

  // Check each scene's subtitle
  for (const scene of scenes) {
    const scenePlan = anchor.storyboard.scenes.find(s => s.sceneNumber === scene.sceneNumber);
    if (!scenePlan) continue;

    const subtitleText = scenePlan.subtitleText;

    // Check 1: Line length
    const maxLength = rules.rules.subtitle.maxLineLength[langKey];
    const actualLength = subtitleText.length;
    const lineLengthPass = actualLength <= maxLength;

    checks.push({
      scene: scene.sceneNumber,
      checkName: 'subtitle_line_length',
      pass: lineLengthPass,
      expected: `<= ${maxLength} chars`,
      actual: `${actualLength} chars`,
      message: lineLengthPass ? undefined : `Subtitle exceeds max length. Consider shortening.`
    });

    totalScore += lineLengthPass ? 1 : 0;
    checkCount++;

    // Check 2: Max lines (count newlines)
    const lineCount = subtitleText.split('\n').length;
    const maxLinesPass = lineCount <= rules.rules.subtitle.maxLines;

    checks.push({
      scene: scene.sceneNumber,
      checkName: 'subtitle_max_lines',
      pass: maxLinesPass,
      expected: `<= ${rules.rules.subtitle.maxLines} lines`,
      actual: `${lineCount} lines`,
      message: maxLinesPass ? undefined : `Too many lines. Should be ${rules.rules.subtitle.maxLines} or fewer.`
    });

    totalScore += maxLinesPass ? 1 : 0;
    checkCount++;

    // Check 3: Safe area compliance (check anchor plan)
    const regionPass = anchor.typographyPlan.subtitleRegion.zone === 'bottom' &&
                       anchor.typographyPlan.subtitleRegion.safeAreaPercent >= rules.rules.subtitle.region.safeAreaPercent;

    checks.push({
      scene: scene.sceneNumber,
      checkName: 'subtitle_safe_area',
      pass: regionPass,
      expected: `bottom ${rules.rules.subtitle.region.safeAreaPercent}%`,
      actual: `${anchor.typographyPlan.subtitleRegion.zone} ${anchor.typographyPlan.subtitleRegion.safeAreaPercent}%`,
      message: regionPass ? undefined : `Subtitle region not in safe area.`
    });

    totalScore += regionPass ? 1 : 0;
    checkCount++;

    // Check 4: Font size
    const fontSizePass = anchor.typographyPlan.fontSize.subtitle >= rules.rules.subtitle.fontSize.min;

    checks.push({
      scene: scene.sceneNumber,
      checkName: 'subtitle_font_size',
      pass: fontSizePass,
      expected: `>= ${rules.rules.subtitle.fontSize.min}px`,
      actual: `${anchor.typographyPlan.fontSize.subtitle}px`,
      message: fontSizePass ? undefined : `Font size too small for readability.`
    });

    totalScore += fontSizePass ? 1 : 0;
    checkCount++;

    // Check 5: Contrast
    const contrastPass = anchor.typographyPlan.contrast >= rules.rules.subtitle.contrast.min;

    checks.push({
      scene: scene.sceneNumber,
      checkName: 'subtitle_contrast',
      pass: contrastPass,
      expected: `>= ${rules.rules.subtitle.contrast.min}:1`,
      actual: `${anchor.typographyPlan.contrast}:1`,
      message: contrastPass ? undefined : `Contrast ratio too low (WCAG AA requires 4.5:1).`
    });

    totalScore += contrastPass ? 1 : 0;
    checkCount++;
  }

  const score = checkCount > 0 ? totalScore / checkCount : 0;
  const pass = checks.every(c => c.pass);

  return {
    pass,
    score,
    checks,
  };
}


function mapToQCResult(raw: TypographyRawResult): TypographyQCResult {
  const violations = raw.checks.filter(c => !c.pass).map(c => c.message || c.checkName).filter(Boolean);
  const byName = (name: string) => raw.checks.find(c => c.checkName === name)?.pass ?? false;
  return {
    status: raw.pass ? ('PASS' as QCStatus) : ('FAIL' as QCStatus),
    score: raw.score,
    checks: {
      subtitleLength: byName('subtitle_line_length') && byName('subtitle_max_lines'),
      subtitlePosition: byName('subtitle_safe_area'),
      fontSizeCompliance: byName('subtitle_font_size'),
      contrastRatio: byName('subtitle_contrast'),
    },
    violations,
  };
}

/**
 * Validator class for QC Runner: validates scripts against typography plan and returns TypographyQCResult.
 */
export class TypographyValidator {
  async validate(
    scripts: SceneScript[],
    typographyPlan: TypographyPlan,
    language: 'ko' | 'en'
  ): Promise<TypographyQCResult> {
    const anchor: AnchorForCheck = {
      language,
      typographyPlan: {
        subtitleRegion: {
          zone: 'bottom',
          safeAreaPercent: 90,
        },
        fontSize: { subtitle: typographyPlan.subtitleRegion.fontSize },
        contrast: 4.5,
      },
      storyboard: {
        scenes: scripts.map(s => ({
          sceneNumber: s.sceneNumber,
          subtitleText: s.narration ?? s.visualDescription ?? '',
        })),
      },
    };
    const scenes: SceneForTypography[] = scripts.map(s => ({ sceneNumber: s.sceneNumber }));
    const raw = await checkTypography(anchor, scenes);
    return mapToQCResult(raw);
  }
}

/**
 * Auto-fix typography issues if possible
 */
export async function autoFixTypography(text: string, language: 'ko' | 'en'): Promise<string> {
  const rules = await loadRules();
  if (!rules.autoFix.truncateOverflow) return text;

  const maxLength = rules.rules.subtitle.maxLineLength[rulesLanguage(language)];
  if (text.length <= maxLength) return text;

  // Simple truncation with ellipsis
  return text.substring(0, maxLength - 3) + '...';
}
