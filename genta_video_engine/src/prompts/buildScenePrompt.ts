/**
 * Scene Prompt Builder
 * Builds prompts using Anchor constraints for consistent output
 */

import { Anchor, SceneType, SceneStoryboard } from '../shared/types';

export class ScenePromptBuilder {
  /**
   * Build complete prompt for scene generation
   * Embeds Anchor's styleSignature, storyboard, and safety constraints
   */
  static buildScenePrompt(anchor: Anchor, sceneType: SceneType): string {
    const sceneStoryboard = anchor.storyboard.scenes.find(s => s.sceneType === sceneType);

    if (!sceneStoryboard) {
      throw new Error(`No storyboard found for scene type: ${sceneType}`);
    }

    const styleSignature = anchor.styleSignature;
    const safetyConstraints = anchor.safetyConstraints;

    return `You are an expert children's book video producer. Generate a scene for a 24-second book trailer video.

**STRICT SAFETY REQUIREMENTS** (MUST FOLLOW):
- Target Audience: ${safetyConstraints.targetAudience}
- Required Tone: ${safetyConstraints.requiredTone}
- ABSOLUTELY FORBIDDEN: ${safetyConstraints.forbiddenThemes.join(', ')}
- NEVER use these words: ${safetyConstraints.forbiddenWords.slice(0, 10).join(', ')}...
- This is for CHILDREN - must be warm, friendly, and positive

**STYLE BIBLE** (MUST FOLLOW EXACTLY):
- Visual Style: ${styleSignature.visualStyle}
- Color Palette: ${styleSignature.colorPalette.join(', ')}
- Mood: ${styleSignature.mood}
- Camera Language: ${styleSignature.cameraLanguage}
- Genre: ${styleSignature.genre}

**BOOK INFORMATION**:
- Title: ${anchor.title}

**SCENE TYPE**: ${sceneStoryboard.sceneType.toUpperCase()} (${sceneStoryboard.timeRange[0]}-${sceneStoryboard.timeRange[1]} seconds)

**SCENE OBJECTIVE**: ${sceneStoryboard.objective}

**VISUAL FOCUS**: ${sceneStoryboard.visualFocus}

**STORYBOARD KEYFRAMES**:
${sceneStoryboard.keyframes.map(kf => `  ${kf.timestamp}s: ${kf.description} (${kf.action})`).join('\n')}

Generate a JSON response with the following structure:

{
  "sceneNumber": ${sceneStoryboard.sceneNumber},
  "sceneType": "${sceneStoryboard.sceneType}",
  "narration": "Korean narration text (max 40 characters)",
  "characterDialogue": "Optional character speech (if applicable)",
  "characterName": "Character name if dialogue present",
  "visualDescription": "Detailed visual description in English, following the style bible exactly",
  "keyframePrompt": "Imagen 4 prompt in English - describe the KEY MOMENT image that will be animated. Must include: ${styleSignature.visualStyle}, colors from palette, ${styleSignature.mood} mood. Child-friendly, no scary elements.",
  "videoPrompt": "Veo 3.1 Image-to-Video prompt in English - describe the MOTION/ACTION starting from the keyframe. ${styleSignature.cameraLanguage}. 8 seconds. Smooth, gentle movements. Child-appropriate.",
  "duration": 8
}

**CRITICAL RULES**:
1. Narration must be in KOREAN
2. All prompts must be in ENGLISH
3. Keyframe prompt: Describe a SINGLE MOMENT (will become a still image)
4. Video prompt: Describe the MOTION/ACTION (how the image animates)
5. MUST include style bible elements: ${styleSignature.visualStyle}, ${styleSignature.mood}
6. MUST use color palette: ${styleSignature.colorPalette.slice(0, 3).join(', ')}
7. NO scary, violent, or dark content
8. Keep narration under 40 Korean characters
9. Follow the storyboard keyframes above

Return ONLY the JSON, no other text.`;
  }

  /**
   * Build keyframe image prompt (for Imagen 4)
   */
  static buildKeyframePrompt(
    visualDescription: string,
    styleSignature: Anchor['styleSignature']
  ): string {
    return `${visualDescription}

Style: ${styleSignature.visualStyle}
Colors: ${styleSignature.colorPalette.join(', ')}
Mood: ${styleSignature.mood}

High quality, ${styleSignature.visualStyle}, vibrant colors, child-friendly, warm and inviting, perfect for children ages 5-12, no scary elements, bright and cheerful.`;
  }

  /**
   * Build video prompt (for Veo 3.1 Image-to-Video)
   */
  static buildVideoPrompt(
    action: string,
    cameraLanguage: string,
    duration: number = 8
  ): string {
    return `${action}

Camera: ${cameraLanguage}
Duration: ${duration} seconds

Smooth motion, gentle movements, child-appropriate animation, warm and friendly atmosphere, professional quality, cinematic but playful.`;
  }

  /**
   * Enhance prompt for retry (stronger safety)
   */
  static enhancePromptForRetry(originalPrompt: string, retryCount: number): string {
    const safetyBoost = [
      '\n\n**RETRY ENHANCEMENT** (This is retry attempt #' + retryCount + '):',
      '- EXTRA EMPHASIS: This must be EXTREMELY child-friendly',
      '- DOUBLE CHECK: No dark, scary, or concerning imagery',
      '- TRIPLE CHECK: Warm, bright, positive tone only',
      '- Remove ANY elements that could be remotely concerning for children',
    ].join('\n');

    return originalPrompt + safetyBoost;
  }

  /**
   * Get scene-specific templates
   */
  static getSceneTemplate(sceneType: SceneType): string {
    switch (sceneType) {
      case 'intro':
        return `This is the INTRO scene. Goals:
- Grab attention immediately
- Show book title clearly
- Establish visual style
- Create sense of wonder
- Duration: 0-8 seconds
`;

      case 'body':
        return `This is the BODY scene. Goals:
- Show main character or key moment
- Tease the story
- Build intrigue
- Keep viewer engaged
- Duration: 8-16 seconds
`;

      case 'outro':
        return `This is the OUTRO scene. Goals:
- Call to action ("Available at your library!")
- Show book one more time
- Library branding if applicable
- Warm conclusion
- Duration: 16-24 seconds
`;
    }
  }
}
