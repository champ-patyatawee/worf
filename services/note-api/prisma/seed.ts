import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const existing = await prisma.aIProvider.findFirst();
  if (!existing) {
    await prisma.aIProvider.create({
      data: {
        name: 'OpenAI',
        provider: 'openai',
        apiUrl: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4o-mini',
        isActive: true,
        isDefault: true,
      },
    });
    console.log('[Seed] Created default AIProvider');
  } else {
    console.log('[Seed] AIProvider already exists');
  }
}

seed()
  .catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
