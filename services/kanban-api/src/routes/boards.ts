import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/db.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'untitled';
  let slug = base;
  let counter = 1;
  while (await prisma.board.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

async function resolveBoard(identifier: string) {
  const byId = await prisma.board.findUnique({ where: { id: identifier } });
  if (byId) return byId;
  return prisma.board.findUnique({ where: { slug: identifier } });
}

const boardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/boards', async () => {
    const boards = await prisma.board.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return boards;
  });

  fastify.get('/api/boards/:id', async (request) => {
    const { id } = request.params as { id: string };
    const board = await resolveBoard(id);
    if (!board) throw { statusCode: 404, message: 'Board not found' };
    const full = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        tasks: { orderBy: { position: 'asc' } },
      },
    });
    return full;
  });

  fastify.post('/api/boards', async (request) => {
    const { name, description } = request.body as { name: string; description?: string };
    const slug = await uniqueSlug(name);
    const board = await prisma.board.create({
      data: { name, slug, description: description || null },
    });
    return board;
  });

  fastify.delete('/api/boards/:id', async (request) => {
    const { id } = request.params as { id: string };
    const board = await resolveBoard(id);
    if (!board) throw { statusCode: 404, message: 'Board not found' };
    await prisma.board.delete({ where: { id: board.id } });
    return { success: true };
  });
};

export default boardRoutes;
