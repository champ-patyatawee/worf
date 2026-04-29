import { prisma } from '../config/database';

export interface CreateProviderInput {
  name: string;
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
}

export interface UpdateProviderInput {
  name?: string;
  provider?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export class AIProviderService {
  async list() {
    return prisma.aIProvider.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async get(id: string) {
    return prisma.aIProvider.findUnique({
      where: { id },
    });
  }

  async getActive() {
    return prisma.aIProvider.findFirst({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async create(data: CreateProviderInput) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.aIProvider.create({
      data: {
        name: data.name,
        provider: data.provider,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
        model: data.model,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async update(id: string, data: UpdateProviderInput) {
    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.aIProvider.update({
      where: { id },
      data: {
        name: data.name,
        provider: data.provider,
        apiUrl: data.apiUrl,
        model: data.model,
        isActive: data.isActive,
        isDefault: data.isDefault,
        ...(data.apiKey && { apiKey: data.apiKey }),
      },
    });
  }

  async delete(id: string) {
    return prisma.aIProvider.delete({
      where: { id },
    });
  }
}

export const aiProviderService = new AIProviderService();