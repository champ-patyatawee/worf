import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/db.js';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const pageRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all pages (no folder)
  fastify.get('/api/pages', async () => {
    return prisma.page.findMany({
      where: { folderId: null },
      orderBy: { updatedAt: 'desc' },
    });
  });

  // Get single page by slug
  fastify.get('/api/pages/slug/:slug', async (request) => {
    const { slug } = request.params as { slug: string };
    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      throw { statusCode: 404, message: 'Page not found' };
    }
    return page;
  });

  // Get single page
  fastify.get('/api/pages/:id', async (request) => {
    const { id } = request.params as { id: string };
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw { statusCode: 404, message: 'Page not found' };
    }
    return page;
  });

  // Create page (no folder)
  fastify.post('/api/pages', async (request) => {
    const { title, content } = request.body as { title?: string; content?: any };
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
        content: content || {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [] },
            { type: 'paragraph', content: [] },
          ],
        },
      },
    });
  });

  // Update page
  fastify.put('/api/pages/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { title, content } = request.body as { title?: string; content?: any };
    const updateData: any = {
      ...(content !== undefined && { content }),
    };
    if (title !== undefined) {
      updateData.title = title;
      const baseSlug = generateSlug(title);
      let slug = baseSlug;
      let counter = 1;
      while (true) {
        const existing = await prisma.page.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }
    return prisma.page.update({
      where: { id },
      data: updateData,
    });
  });

  // Delete page
  fastify.delete('/api/pages/:id', async (request) => {
    const { id } = request.params as { id: string };
    return prisma.page.delete({
      where: { id },
    });
  });
};

export default pageRoutes;