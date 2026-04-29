import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const adminPassword = await bcrypt.hash('123456', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@worf.dev' },
    update: {
      role: 'admin',
      status: 'online',
    },
    create: {
      email: 'admin@worf.dev',
      name: 'Admin',
      password: adminPassword,
      status: 'online',
      role: 'admin',
    },
  });

  console.log(`✅ Created admin user`);

  // Create sample channels
  const channels = await Promise.all([
    prisma.channel.upsert({
      where: { id: 'general' },
      update: {},
      create: {
        id: 'general',
        name: 'general',
        description: 'General discussions and announcements',
        type: 'public',
      },
    }),
    prisma.channel.upsert({
      where: { id: 'random' },
      update: {},
      create: {
        id: 'random',
        name: 'random',
        description: 'Random conversations and off-topic discussions',
        type: 'public',
      },
    }),
    prisma.channel.upsert({
      where: { id: 'engineering' },
      update: {},
      create: {
        id: 'engineering',
        name: 'engineering',
        description: 'Engineering team discussions',
        type: 'public',
      },
    }),
  ]);

  console.log(`✅ Created ${channels.length} channels`);

  // Add admin to all channels
  for (const channel of channels) {
    await prisma.channelMember.upsert({
      where: {
        channelId_userId: {
          channelId: channel.id,
          userId: admin.id,
        },
      },
      update: {},
      create: {
        channelId: channel.id,
        userId: admin.id,
      },
    });
  }

  console.log('✅ Added admin to channels');

  console.log('✨ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
