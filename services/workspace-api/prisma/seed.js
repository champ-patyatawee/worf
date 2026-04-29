"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    const adminPassword = await bcrypt_1.default.hash('123456', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@worf.dev' },
        update: {},
        create: {
            email: 'admin@worf.dev',
            name: 'Admin',
            password: adminPassword,
            status: 'online',
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
//# sourceMappingURL=seed.js.map