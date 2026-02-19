/**
 * Book entity representing a library book
 */
export interface Book {
  bookId: string;
  title: string;
  author: string;
  summary: string;
  genre: string;
  shelfCode: string;
  coverImageUrl?: string;
  publishedYear?: number;
  publisher?: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Book search filters
 */
export interface BookSearchFilters {
  query?: string;
  genre?: string;
  author?: string;
  limit?: number;
  offset?: number;
}

/**
 * Book detail with availability information
 */
export interface BookDetail extends Book {
  isAvailable: boolean;
  totalCopies: number;
  availableCopies: number;
}
