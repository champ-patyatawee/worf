import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/db.js';

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/tasks', async (request) => {
    const { title, description, priority, status, board_id } = request.body as {
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      board_id: string;
    };

    const board = await prisma.board.findFirst({
      where: { OR: [{ id: board_id }, { slug: board_id }] },
    });
    if (!board) throw { statusCode: 404, message: 'Board not found' };

    const maxPosition = await prisma.task.aggregate({
      where: { boardId: board.id },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || 'medium',
        status: status || 'todo',
        position: (maxPosition._max.position ?? -1) + 1,
        boardId: board.id,
      },
    });
    return task;
  });

  fastify.put('/api/tasks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
    };
    const task = await prisma.task.update({
      where: { id },
      data,
    });
    return task;
  });

  fastify.delete('/api/tasks/:id', async (request) => {
    const { id } = request.params as { id: string };
    await prisma.task.delete({ where: { id } });
    return { success: true };
  });

  fastify.post('/api/tasks/:id/move', async (request) => {
    const { id } = request.params as { id: string };
    const { status, position } = request.body as { status: string; position?: number };

    await prisma.task.update({
      where: { id },
      data: { status, position },
    });

    const allTasks = await prisma.task.findMany({
      where: { status },
      orderBy: { position: 'asc' },
    });

    await Promise.all(
      allTasks.map((t, i) =>
        prisma.task.update({
          where: { id: t.id },
          data: { position: i },
        })
      )
    );

    return prisma.task.findUnique({ where: { id } });
  });
};

export default taskRoutes;
