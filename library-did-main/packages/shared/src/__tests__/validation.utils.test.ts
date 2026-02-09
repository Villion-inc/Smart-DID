import { isContentSafe, isValidBookId, sanitizeInput } from '../utils/validation.utils';

describe('Validation Utils', () => {
  describe('isContentSafe', () => {
    it('should return true for safe content', () => {
      expect(isContentSafe('A beautiful story about friendship')).toBe(true);
      expect(isContentSafe('우정에 대한 아름다운 이야기')).toBe(true);
      expect(isContentSafe('Educational book for children')).toBe(true);
    });

    it('should return false for unsafe content', () => {
      expect(isContentSafe('A horror story')).toBe(false);
      expect(isContentSafe('Violence and blood')).toBe(false);
      expect(isContentSafe('Political content')).toBe(false);
      expect(isContentSafe('Dark and scary themes')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isContentSafe('HORROR STORY')).toBe(false);
      expect(isContentSafe('Violence')).toBe(false);
    });
  });

  describe('isValidBookId', () => {
    it('should return true for valid book IDs', () => {
      expect(isValidBookId('ISBN-001')).toBe(true);
      expect(isValidBookId('978-3-16-148410-0')).toBe(true);
      expect(isValidBookId('BOOK_123')).toBe(true);
    });

    it('should return false for invalid book IDs', () => {
      expect(isValidBookId('')).toBe(false);
      expect(isValidBookId('   ')).toBe(false);
      expect(isValidBookId('book@id')).toBe(false);
      expect(isValidBookId('book id')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        'script alert("xss") /script'
      );
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello b World /b');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  Hello  ')).toBe('Hello');
    });

    it('should handle normal text', () => {
      expect(sanitizeInput('Normal text')).toBe('Normal text');
    });
  });
});
