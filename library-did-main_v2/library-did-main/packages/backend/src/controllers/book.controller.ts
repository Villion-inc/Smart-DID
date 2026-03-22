import { FastifyRequest, FastifyReply } from 'fastify';
import { bookService } from '../services/book.service';
import { SearchBooksInput } from '../schemas/book.schema';

export class BookController {
  async searchBooks(
    request: FastifyRequest<{ Querystring: SearchBooksInput }>,
    reply: FastifyReply
  ) {
    const { keyword = '' } = request.query;
    const books = await bookService.searchBooks(keyword);

    return reply.send({
      success: true,
      data: books,
    });
  }

  async getBookDetail(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const book = await bookService.getBookDetail(bookId);

    if (!book) {
      return reply.code(404).send({
        success: false,
        error: 'Book not found',
      });
    }

    return reply.send({
      success: true,
      data: book,
    });
  }
}

export const bookController = new BookController();
