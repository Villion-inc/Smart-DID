import { FastifyInstance } from 'fastify';
import { adminController } from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/auth.middleware';
import { videoUpdateSchema, videoStatusQuerySchema } from '../schemas/video.schema';

export async function adminRoutes(fastify: FastifyInstance) {
  // All admin routes require authentication
  fastify.addHook('preHandler', requireAdmin);

  // =====================
  // Dashboard
  // =====================
  fastify.get('/admin/dashboard/stats', adminController.getDashboardStats.bind(adminController));

  // =====================
  // Recommendations
  // =====================
  fastify.get('/admin/recommendations/new-arrivals', adminController.getNewArrivals.bind(adminController));
  fastify.get('/admin/recommendations/librarian-picks', adminController.getLibrarianPicks.bind(adminController));

  // =====================
  // Video Management
  // =====================
  fastify.post('/admin/books/:bookId/video', adminController.requestVideoGeneration.bind(adminController));
  fastify.get('/admin/videos', adminController.getVideos.bind(adminController));
  fastify.patch('/admin/books/:bookId/video', adminController.updateVideo.bind(adminController));

  // =====================
  // Bestseller Seed (베스트셀러 100권 사전 생성)
  // =====================
  fastify.post('/admin/seed/bestsellers', adminController.seedBestsellers.bind(adminController));
  fastify.post('/admin/seed/age-group/:ageGroup', adminController.seedByAgeGroup.bind(adminController));
  fastify.get('/admin/seed/status', adminController.getSeedStatus.bind(adminController));

  // =====================
  // Queue Management (큐 관리)
  // =====================
  fastify.get('/admin/queue/stats', adminController.getQueueStats.bind(adminController));
  fastify.get('/admin/queue/waiting', adminController.getWaitingJobs.bind(adminController));
  fastify.delete('/admin/queue/:bookId', adminController.cancelJob.bind(adminController));
  fastify.post('/admin/queue/:bookId/retry', adminController.retryFailedJob.bind(adminController));

  // =====================
  // Cache Management (캐시 관리 - LRU 기반 자동 삭제)
  // =====================
  fastify.get('/admin/cache/stats', adminController.getCacheStats.bind(adminController));
  fastify.post('/admin/cache/cleanup', adminController.cleanupStaleVideos.bind(adminController));

  // =====================
  // Notifications
  // =====================
  fastify.get('/admin/notifications', adminController.getNotifications.bind(adminController));
  fastify.patch('/admin/notifications/:id/read', adminController.markNotificationAsRead.bind(adminController));
  fastify.post('/admin/notifications/mark-all-read', adminController.markAllNotificationsAsRead.bind(adminController));
}
