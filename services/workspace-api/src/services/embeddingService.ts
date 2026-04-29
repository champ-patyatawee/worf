import { pipeline, env } from '@xenova/transformers';
import { prisma } from '../config/database';
import path from 'path';

env.allowLocalModels = true;
env.useBrowserCache = false;
env.localModelPath = '/models';

const MODEL = 'Xenova/nomic-embed-text-v1';

let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL, {
      local_files_only: true,
    });
  }
  return extractorPromise;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
}

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    const cleanText = text.trim();
    if (!cleanText) {
      return [];
    }

    try {
      const extractor = await getExtractor();
      const result = await extractor(cleanText, {
        pooling: 'mean',
        normalize: true,
      });

      return Array.from(result.data);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async getOrCreateEmbedding(
    type: 'message' | 'directMessage',
    id: string,
    content: string
  ): Promise<number[]> {
    const embedding = await this.generateEmbedding(content);

    const data: { embedding: string } = {
      embedding: JSON.stringify(embedding),
    };

    if (type === 'message') {
      await prisma.message.update({
        where: { id },
        data,
      });
    } else {
      await prisma.directMessage.update({
        where: { id },
        data,
      });
    }

    return embedding;
  }

  async generateMessageEmbeddings(
    batchSize: number = 100,
    offset: number = 0
  ): Promise<{ processed: number; errors: number }> {
    const messagesWithoutEmbedding = await prisma.message.findMany({
      where: {
        embedding: null,
      },
      select: {
        id: true,
        content: true,
      },
      take: batchSize,
      skip: offset,
    });

    let processed = 0;
    let errors = 0;

    for (const message of messagesWithoutEmbedding) {
      try {
        const embedding = await this.generateEmbedding(message.content);
        await prisma.message.update({
          where: { id: message.id },
          data: { embedding: JSON.stringify(embedding) },
        });
        processed++;
      } catch (error) {
        console.error(`Failed to process message ${message.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }

  async generateDMEmbeddings(
    batchSize: number = 100,
    offset: number = 0
  ): Promise<{ processed: number; errors: number }> {
    const dmsWithoutEmbedding = await prisma.directMessage.findMany({
      where: {
        embedding: null,
      },
      select: {
        id: true,
        content: true,
      },
      take: batchSize,
      skip: offset,
    });

    let processed = 0;
    let errors = 0;

    for (const dm of dmsWithoutEmbedding) {
      try {
        const embedding = await this.generateEmbedding(dm.content);
        await prisma.directMessage.update({
          where: { id: dm.id },
          data: { embedding: JSON.stringify(embedding) },
        });
        processed++;
      } catch (error) {
        console.error(`Failed to process DM ${dm.id}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }

  async getEmbeddingStats(): Promise<{
    totalMessages: number;
    messagesWithEmbedding: number;
    totalDMs: number;
    dmsWithEmbedding: number;
  }> {
    const [totalMessages, messagesWithEmbedding, totalDMs, dmsWithEmbedding] = await Promise.all([
      prisma.message.count(),
      prisma.message.count({ where: { embedding: { not: null } } }),
      prisma.directMessage.count(),
      prisma.directMessage.count({ where: { embedding: { not: null } } }),
    ]);

    return {
      totalMessages,
      messagesWithEmbedding,
      totalDMs,
      dmsWithEmbedding,
    };
  }
}

export const embeddingService = new EmbeddingService();