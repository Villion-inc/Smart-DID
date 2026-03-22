import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';

const AUDIT_PATHS = [
  '/auth/login',
  '/admin/',
  '/internal/',
];

function shouldAudit(url: string): boolean {
  return AUDIT_PATHS.some(p => url.includes(p));
}

export function setupAuditLogging(fastify: FastifyInstance) {
  const logDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const auditStream = fs.createWriteStream(
    path.join(logDir, 'audit.log'),
    { flags: 'a' },
  );

  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    if (!shouldAudit(request.url)) return done();

    const entry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || '',
      userId: (request.user as any)?.id || null,
      username: (request.user as any)?.username || null,
      statusCode: reply.statusCode,
    };

    auditStream.write(JSON.stringify(entry) + '\n');
    done();
  });
}
