import Fastify from 'fastify';
import cors from '@fastify/cors';
import boardRoutes from './routes/boards.js';
import taskRoutes from './routes/tasks.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
});

// Auth hook — reads user identity from headers set by Traefik ForwardAuth
fastify.addHook('preHandler', async (request, reply) => {
  // Allow CORS preflight through
  if (request.method === 'OPTIONS') return;

  const userId = request.headers['x-user-id'] as string | undefined;
  const userEmail = request.headers['x-user-email'] as string | undefined;
  const userRole = request.headers['x-user-role'] as string | undefined;

  if (!userId) {
    reply.status(401).send({ success: false, error: 'Unauthorized' });
    return;
  }

  // Attach user info to request for use in route handlers
  (request as any).user = { id: userId, email: userEmail, role: userRole };
});

await fastify.register(boardRoutes);
await fastify.register(taskRoutes);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
