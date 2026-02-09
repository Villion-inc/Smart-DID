import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to verify JWT token
 * Fastify JWT automatically attaches decoded token to request.user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: 'Unauthorized - Invalid or missing token',
    });
  }
}

/**
 * Middleware to check if user is admin
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const user = (request as any).user;

    if (!user || user.role !== 'admin') {
      return reply.code(403).send({
        success: false,
        error: 'Admin access required',
      });
    }
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: 'Unauthorized - Invalid or missing token',
    });
  }
}
