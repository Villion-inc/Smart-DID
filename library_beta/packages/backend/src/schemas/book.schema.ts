import { z } from 'zod';

export const searchBooksSchema = z.object({
  keyword: z.string().optional(),
});

export const bookIdSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
});

export type SearchBooksInput = z.infer<typeof searchBooksSchema>;
export type BookIdInput = z.infer<typeof bookIdSchema>;
