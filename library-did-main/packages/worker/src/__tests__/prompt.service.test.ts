import { promptService } from '../services/prompt.service';

describe('PromptService', () => {
  describe('generateScene1Prompt', () => {
    it('should generate intro scene prompt', () => {
      const scene = promptService.generateScene1Prompt('별을 헤아리는 아이', '김동화');

      expect(scene.sceneNumber).toBe(1);
      expect(scene.duration).toBe(8);
      expect(scene.prompt).toContain('별을 헤아리는 아이');
      expect(scene.prompt).toContain('김동화');
      expect(scene.subtitleText).toContain('별을 헤아리는 아이');
      expect(scene.subtitleText).toContain('김동화');
    });
  });

  describe('generateScene2Prompt', () => {
    it('should generate main content scene prompt', () => {
      const summary = '밤하늘의 별을 세며 꿈을 키워가는 소년의 이야기입니다.';
      const scene = promptService.generateScene2Prompt('별을 헤아리는 아이', summary);

      expect(scene.sceneNumber).toBe(2);
      expect(scene.duration).toBe(8);
      expect(scene.prompt).toContain(summary);
      expect(scene.subtitleText).toBeDefined();
    });
  });

  describe('generateScene3Prompt', () => {
    it('should generate conclusion scene prompt', () => {
      const scene = promptService.generateScene3Prompt('별을 헤아리는 아이');

      expect(scene.sceneNumber).toBe(3);
      expect(scene.duration).toBe(8);
      expect(scene.subtitleText).toContain('재미있게 읽어보세요');
    });
  });

  describe('validateSafety', () => {
    it('should return true for safe content', () => {
      const result = promptService.validateSafety(
        '우정의 이야기',
        '친구들과의 따뜻한 이야기'
      );

      expect(result).toBe(true);
    });

    it('should return false for unsafe content', () => {
      const result = promptService.validateSafety(
        'Horror Story',
        'A dark and violent tale'
      );

      expect(result).toBe(false);
    });
  });

  describe('generateAllScenes', () => {
    it('should generate all 3 scenes', () => {
      const scenes = promptService.generateAllScenes(
        '별을 헤아리는 아이',
        '김동화',
        '밤하늘의 별을 세며 꿈을 키워가는 소년의 이야기입니다.'
      );

      expect(scenes).toHaveLength(3);
      expect(scenes[0].sceneNumber).toBe(1);
      expect(scenes[1].sceneNumber).toBe(2);
      expect(scenes[2].sceneNumber).toBe(3);
    });
  });
});
