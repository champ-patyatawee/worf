import { PgBoss } from 'pg-boss';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    bossInstance = new PgBoss(DATABASE_URL as string);
    await bossInstance.start();
    console.log('pg-boss started');
  }
  return bossInstance;
}

export async function stopBoss(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop();
    bossInstance = null;
    console.log('pg-boss stopped');
  }
}