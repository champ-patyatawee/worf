import Fastify from 'fastify';
import cors from '@fastify/cors';
import boardRoutes from './routes/boards.js';
import taskRoutes from './routes/tasks.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
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
