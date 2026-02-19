import { FastifyInstance } from 'fastify';
import { didController } from '../controllers/did.controller';

/**
 * DID Routes
 *
 * Public routes for Digital Information Display (DID) touch interface.
 * No authentication required - designed for public library kiosk use.
 *
 * All responses are optimized for large touch screen display with minimal data.
 */
export async function didRoutes(fastify: FastifyInstance) {
  // =====================
  // Book Discovery
  // =====================

  // Get new arrival books
  fastify.get('/did/new-arrivals', didController.getNewArrivals.bind(didController));

  // Get librarian recommended books
  fastify.get('/did/librarian-picks', didController.getLibrarianPicks.bind(didController));

  // Get books by age group (preschool | elementary | teen)
  fastify.get('/did/age/:group', didController.getBooksByAge.bind(didController));

  // Search books (with video status)
  fastify.get('/did/search', didController.searchBooks.bind(didController));

  // =====================
  // Book Detail
  // =====================

  // Get book detail for DID view
  fastify.get('/did/books/:bookId', didController.getBookDetail.bind(didController));

  // =====================
  // Video Endpoints
  // =====================

  // Get video status for a book
  // Returns: { status: 'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED', videoUrl?: string }
  fastify.get('/did/books/:bookId/video', didController.getVideoStatus.bind(didController));

  // Request video generation for a book
  // - If READY: returns video URL immediately
  // - If QUEUED/GENERATING: returns current status
  // - If NONE/FAILED: adds to queue and returns QUEUED status
  fastify.post('/did/books/:bookId/video/request', didController.requestVideo.bind(didController));

  // Get popular videos (ranked by views)
  fastify.get('/did/videos/popular', didController.getPopularVideos.bind(didController));
}
