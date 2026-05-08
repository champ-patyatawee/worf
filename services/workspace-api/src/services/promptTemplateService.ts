import { prisma } from '../config/database';

export interface CreatePromptTemplateInput {
  name: string;
  content: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdatePromptTemplateInput {
  name?: string;
  content?: string;
  description?: string;
  isDefault?: boolean;
}

export class PromptTemplateService {
  async listByUser(userId: string) {
    return prisma.promptTemplate.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    return prisma.promptTemplate.findUnique({
      where: { id },
    });
  }

  async getDefault(userId: string) {
    return prisma.promptTemplate.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async create(userId: string, data: CreatePromptTemplateInput) {
    // If this is set as default, unset other defaults for this user
    if (data.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.promptTemplate.create({
      data: {
        userId,
        name: data.name,
        content: data.content,
        description: data.description,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(id: string, userId: string, data: UpdatePromptTemplateInput) {
    // Verify ownership
    const existing = await prisma.promptTemplate.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Prompt template not found');
    }

    // If this is set as default, unset other defaults for this user
    if (data.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.promptTemplate.update({
      where: { id },
      data: {
        name: data.name,
        content: data.content,
        description: data.description,
        isDefault: data.isDefault,
      },
    });
  }

  async delete(id: string, userId: string) {
    // Verify ownership
    const existing = await prisma.promptTemplate.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new Error('Prompt template not found');
    }

    return prisma.promptTemplate.delete({
      where: { id },
    });
  }
}

export const promptTemplateService = new PromptTemplateService();
