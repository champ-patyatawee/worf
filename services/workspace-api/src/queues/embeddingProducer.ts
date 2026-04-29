import { getBoss } from './pgBoss';

export interface EmbedJobData {
  type: 'message' | 'directMessage';
  targetId: string;
  content: string;
}

export async function queueEmbedMessage(
  type: 'message' | 'directMessage',
  targetId: string,
  content: string
): Promise<void> {
  if (!content || !content.trim()) {
    return;
  }

  try {
    const boss = await getBoss();
    await boss.send('embedMessage', { type, targetId, content } as EmbedJobData);
  } catch (error) {
    console.error('Failed to queue embedding job:', error);
  }
}