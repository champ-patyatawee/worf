import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const getDatabaseUrl = () =>
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://workspace:workspace_dev@postgres-test:5432/workspace_test';

let prisma: PrismaClient;

beforeAll(async () => {
  const dbUrl = getDatabaseUrl();
  process.env.DATABASE_URL = dbUrl;
  process.env.TEST_DATABASE_URL = dbUrl;

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE;`;
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS public;`;

  await execAsync('npx prisma db push --force-reset', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });
});

afterAll(async () => {
  if (prisma) {
    try {
      await prisma.$executeRaw`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`;
    } catch {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  }
});