import { UNSAFE_KEYWORDS } from '../constants/video.constants';

/**
 * Validate if content is child-friendly
 * @param content - Text content to validate
 * @returns True if content is safe
 */
export function isContentSafe(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return !UNSAFE_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
}

/**
 * Validate book ID format (ISBN-10, ISBN-13, or custom)
 * @param bookId - Book ID to validate
 * @returns True if valid
 */
export function isValidBookId(bookId: string): boolean {
  if (!bookId || bookId.trim().length === 0) return false;
  // Allow ISBN-10, ISBN-13, or custom format
  return /^[\w-]+$/.test(bookId);
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize user input
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
