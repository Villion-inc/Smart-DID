import { VideoScene } from '@smart-did/shared';
import { config } from '../config';
import { isTextSafeForChildren } from '../qc/safetyCheck';

/**
 * Service for generating video prompts
 */
export class PromptService {
  /**
   * Generate prompt for scene 1 (introduction)
   */
  generateScene1Prompt(title: string, author: string): VideoScene {
    const subtitleText = `${title}, ${author} 작가님의 작품입니다.`;

    const prompt = `Generate an 8-second intro scene using Veo3.1.
Metadata:
- title: ${title}
- author: ${author}

Safety: Child-friendly, no horror/violence/political/dark themes.
Goals:
- Display book title + author
- Korean subtitles: "${subtitleText}"
- Warm, welcoming visuals with soft colors
- Simple book cover or library scene`;

    return {
      sceneNumber: 1,
      duration: config.video.sceneDuration,
      prompt,
      subtitleText,
    };
  }

  /**
   * Generate prompt for scene 2 (main content)
   */
  generateScene2Prompt(title: string, summary: string): VideoScene {
    const mainIdea = this.extractMainIdea(summary);
    const subtitleText = `이 책은 ${mainIdea}에 대한 이야기입니다.`;

    const prompt = `Generate an 8-second main content scene using Veo3.1.
Metadata:
- title: ${title}
- summary: ${summary}

Safety: Child-friendly, no horror/violence/political/dark themes.
Goals:
- Highlight key idea: ${mainIdea}
- Korean subtitles: "${subtitleText}"
- Engaging visuals representing the book's theme
- Bright, colorful, educational tone`;

    return {
      sceneNumber: 2,
      duration: config.video.sceneDuration,
      prompt,
      subtitleText,
    };
  }

  /**
   * Generate prompt for scene 3 (conclusion)
   */
  generateScene3Prompt(title: string): VideoScene {
    const subtitleText = `재미있게 읽어보세요!`;

    const prompt = `Generate an 8-second conclusion scene using Veo3.1.
Metadata:
- title: ${title}

Safety: Child-friendly.
Goals:
- Warm closing visuals
- Korean subtitles: "${subtitleText}"
- Encouraging, positive ending
- Call-to-action to read the book`;

    return {
      sceneNumber: 3,
      duration: config.video.sceneDuration,
      prompt,
      subtitleText,
    };
  }

  /**
   * Extract main idea from summary
   */
  private extractMainIdea(summary: string): string {
    const sentences = summary.split(/[.!?]/);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length > 50) {
        return firstSentence.substring(0, 50) + '...';
      }
      return firstSentence;
    }
    return summary.substring(0, 50);
  }

  /**
   * Validate content safety (QC safetyGate와 동일한 safetyKeywords 사용)
   */
  validateSafety(title: string, summary: string): boolean {
    return isTextSafeForChildren(title) && isTextSafeForChildren(summary);
  }

  /**
   * Generate all scenes for a book
   */
  generateAllScenes(title: string, author: string, summary: string): VideoScene[] {
    return [
      this.generateScene1Prompt(title, author),
      this.generateScene2Prompt(title, summary),
      this.generateScene3Prompt(title),
    ];
  }
}

export const promptService = new PromptService();
