import { PgBoss } from 'pg-boss';
import { embeddingService } from '../services/embeddingService';
import { prisma } from '../config/database';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const boss = new PgBoss(DATABASE_URL);

interface EmbedJobData {
  type: 'message' | 'directMessage';
  targetId: string;
  content: string;
}

boss.on('error', (error: Error) => {
  console.error('pg-boss worker error:', error);
});

boss.on('warning', (warning) => {
  console.warn('pg-boss worker warning:', warning);
});

async function start() {
  await boss.start();
  console.log('pg-boss started');

  await boss.createQueue('embedMessage');
  console.log('queue created');

  await boss.work('embedMessage', { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      const { type, targetId, content } = job.data as EmbedJobData;
      console.log(`Processing embedding for ${type}:${targetId}`);

      try {
        const embedding = await embeddingService.generateEmbedding(content);

        if (type === 'message') {
          await prisma.message.update({
            where: { id: targetId },
            data: { embedding: JSON.stringify(embedding) },
          });
        } else {
          await prisma.directMessage.update({
            where: { id: targetId },
            data: { embedding: JSON.stringify(embedding) },
          });
        }

        console.log(`Embedding complete for ${type}:${targetId}`);
      } catch (error) {
        console.error(`Failed embedding for ${type}:${targetId}:`, error);
        throw error;
      }
    }
  });

  console.log('Embedding worker started, waiting for jobs...');
}

start();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, stopping worker...');
  await boss.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, stopping worker...');
  await boss.stop();
  process.exit(0);
});