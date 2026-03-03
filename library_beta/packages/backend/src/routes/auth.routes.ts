import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller';
import { loginSchema } from '../schemas/auth.schema';
import { authenticate } from '../middleware/auth.middleware';

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post('/auth/login', authController.login.bind(authController));

  // Get current user (protected)
  fastify.get('/auth/me', {
    preHandler: [authenticate],
    handler: authController.me.bind(authController),
  });
}
