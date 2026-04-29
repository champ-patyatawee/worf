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