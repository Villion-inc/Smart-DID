/**
 * In-memory database store (for development)
 * Replace with actual database (PostgreSQL, MongoDB, etc.) in production
 */

import { Book, VideoRecord, User } from '@smart-did/shared';

export class InMemoryDB {
  private books: Map<string, Book> = new Map();
  private videoRecords: Map<string, VideoRecord> = new Map();
  private users: Map<string, User> = new Map();

  // Book operations
  async getBook(bookId: string): Promise<Book | null> {
    return this.books.get(bookId) || null;
  }

  async findBooks(filters?: { query?: string; genre?: string; limit?: number }): Promise<Book[]> {
    let books = Array.from(this.books.values());

    if (filters?.query) {
      const query = filters.query.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query)
      );
    }

    if (filters?.genre) {
      books = books.filter((b) => b.genre === filters.genre);
    }

    return books.slice(0, filters?.limit || 50);
  }

  async createBook(book: Book): Promise<Book> {
    this.books.set(book.bookId, book);
    return book;
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book | null> {
    const book = this.books.get(bookId);
    if (!book) return null;

    const updated = { ...book, ...updates, updatedAt: new Date() };
    this.books.set(bookId, updated);
    return updated;
  }

  // VideoRecord operations
  async getVideoRecord(bookId: string): Promise<VideoRecord | null> {
    return this.videoRecords.get(bookId) || null;
  }

  async createVideoRecord(record: VideoRecord): Promise<VideoRecord> {
    this.videoRecords.set(record.bookId, record);
    return record;
  }

  async updateVideoRecord(
    bookId: string,
    updates: Partial<VideoRecord>
  ): Promise<VideoRecord | null> {
    const record = this.videoRecords.get(bookId);
    if (!record) return null;

    const updated = { ...record, ...updates, updatedAt: new Date() };
    this.videoRecords.set(bookId, updated);
    return updated;
  }

  async findVideoRecordsByStatus(status: string): Promise<VideoRecord[]> {
    return Array.from(this.videoRecords.values()).filter((r) => r.status === status);
  }

  async findReadyVideos(limit: number = 20): Promise<VideoRecord[]> {
    return Array.from(this.videoRecords.values())
      .filter((r) => r.status === 'READY')
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, limit);
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return Array.from(this.users.values()).find((u) => u.username === username) || null;
  }

  async createUser(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  // Utility
  async clear(): Promise<void> {
    this.books.clear();
    this.videoRecords.clear();
    this.users.clear();
  }
}

export const db = new InMemoryDB();
