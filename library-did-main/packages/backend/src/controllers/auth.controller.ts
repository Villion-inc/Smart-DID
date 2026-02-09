import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';
import { LoginInput } from '../schemas/auth.schema';

export class AuthController {
  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    const { username, password } = request.body;

    const user = await authService.validateUser(username, password);
    if (!user) {
      return reply.code(401).send({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const token = request.server.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return reply.send({
      success: true,
      data: {
        token,
        username: user.username,
        role: user.role,
      },
    });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as any).user;
    return reply.send({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  }
}

export const authController = new AuthController();
