import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/db.js';

const folderRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all folders
  fastify.get('/api/folders', async () => {
    return prisma.folder.findMany({
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  // Create folder
  fastify.post('/api/folders', async (request) => {
    const { name } = request.body as { name: string };
    return prisma.folder.create({
      data: { name },
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  // Delete folder
  fastify.delete('/api/folders/:id', async (request) => {
    const { id } = request.params as { id: string };
    return prisma.folder.delete({
      where: { id },
    });
  });

  // Rename folder
  fastify.patch('/api/folders/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };
    return prisma.folder.update({
      where: { id },
      data: { name },
    });
  });

  // Get pages in folder
  fastify.get('/api/folders/:id/pages', async (request) => {
    const { id } = request.params as { id: string };
    return prisma.page.findMany({
      where: { folderId: id },
      orderBy: { updatedAt: 'desc' },
    });
  });

  // Create page in folder
  fastify.post('/api/folders/:id/pages', async (request) => {
    const { id: folderId } = request.params as { id: string };
    const { title } = request.body as { title?: string };
    const baseSlug = generateSlug(title || 'untitled');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.page.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return prisma.page.create({
      data: {
        title: title || 'Untitled',
        slug,
        folderId,
        content: {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [] },
            { type: 'paragraph', content: [] },
          ],
        },
      },
    });
  });

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
};

export default folderRoutes;