import Fastify from 'fastify';
import cors from '@fastify/cors';
import folderRoutes from './routes/folders.js';
import pageRoutes from './routes/pages.js';
import aiProviderRoutes from './routes/ai-providers.js';
import aiRoutes from './routes/ai.js';
import { loadAgents } from './lib/llm.js';

const fastify = Fastify({ logger: true });

loadAgents();

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

await fastify.register(folderRoutes);
await fastify.register(pageRoutes);
await fastify.register(aiProviderRoutes);
await fastify.register(aiRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();