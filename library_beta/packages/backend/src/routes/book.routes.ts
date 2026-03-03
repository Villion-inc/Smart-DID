import { FastifyInstance } from 'fastify';
import { bookController } from '../controllers/book.controller';
import { videoController } from '../controllers/video.controller';
import { searchBooksSchema, bookIdSchema } from '../schemas/book.schema';

export async function bookRoutes(fastify: FastifyInstance) {
  // Search books
  fastify.get('/books', bookController.searchBooks.bind(bookController));

  // Get book details
  fastify.get('/books/:bookId', bookController.getBookDetail.bind(bookController));

  // Get video status for a book
  fastify.get('/books/:bookId/video', videoController.getVideoStatus.bind(videoController));

  // Request video generation (user request)
  fastify.post('/books/:bookId/video', videoController.requestVideo.bind(videoController));
}
