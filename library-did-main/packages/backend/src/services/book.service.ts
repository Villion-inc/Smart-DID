import { Book } from '../types';
import { alpasService } from './alpas.service';
import { shelfMapRepository } from '../repositories/shelf-map.repository';

export class BookService {
  async searchBooks(keyword: string): Promise<Book[]> {
    return alpasService.searchBooks(keyword);
  }

  async getBookDetail(bookId: string): Promise<Book | null> {
    const book = await alpasService.getBookDetail(bookId);
    if (!book) {
      return null;
    }

    // Enrich with shelf map position if available
    const shelfMap = await shelfMapRepository.findByBookId(bookId);
    if (shelfMap) {
      return {
        ...book,
        shelfCode: shelfMap.shelfCode,
      };
    }

    return book;
  }

  async getNewArrivals(): Promise<Book[]> {
    return alpasService.getNewArrivals();
  }

  async getLibrarianPicks(): Promise<Book[]> {
    return alpasService.getLibrarianPicks();
  }

  async getAllBooks(): Promise<Book[]> {
    return alpasService.getAllBooks();
  }
}

export const bookService = new BookService();
