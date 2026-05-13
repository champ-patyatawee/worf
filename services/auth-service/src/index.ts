import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from 'jsonwebtoken';

const PORT = parseInt(process.env.PORT || '3010', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
});

/**
 * GET /verify
 *
 * Called by Traefik ForwardAuth middleware for every incoming request.
 *
 * - If the token is valid → returns 200 with X-User-* headers
 * - If the token is missing/invalid → returns 401
 * - OPTIONS requests always pass through (CORS preflight)
 */
fastify.get('/verify', async (request, reply) => {
  // Let CORS preflight through
  if (request.method === 'OPTIONS') {
    return reply.status(200).send();
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    fastify.log.warn('Missing Authorization header');
    return reply.status(401).send({ error: 'No authorization header provided' });
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    fastify.log.warn('Invalid authorization format');
    return reply.status(401).send({ error: 'Invalid authorization format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    fastify.log.info(`Token verified for user ${decoded.email} (${decoded.userId})`);

    // These headers will be forwarded to the upstream service
    // via Traefik's authResponseHeaders config
    return reply.status(200).headers({
      'X-User-ID': decoded.userId,
      'X-User-Email': decoded.email,
      'X-User-Role': decoded.role,
    }).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        fastify.log.warn('Expired token rejected');
        return reply.status(401).send({ error: 'Token has expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        fastify.log.warn('Invalid token rejected');
        return reply.status(401).send({ error: 'Invalid token' });
      }
    }
    fastify.log.error({ err: error }, 'Token verification failed');
    return reply.status(401).send({ error: 'Authentication failed' });
  }
});

// Health check (not used by Traefik but useful for debugging)
fastify.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Auth service running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();