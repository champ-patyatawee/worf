import { prisma } from '../config/database';

export interface CreateAgentInput {
  name: string;
  displayName?: string;
  description?: string;
  systemPrompt: string;
  avatar?: string;
  providerId?: string;
  agentUrl?: string;
  agentType?: string;
  slashCommand?: string;
  webViewUrl?: string;
}

export interface UpdateAgentInput {
  displayName?: string;
  description?: string;
  systemPrompt?: string;
  avatar?: string;
  isActive?: boolean;
  providerId?: string;
  agentUrl?: string;
  agentType?: string;
  slashCommand?: string;
  webViewUrl?: string;
}

export class AgentService {
  async list() {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' },
    });
    return agents;
  }

  async get(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });
    return agent;
  }

  async getByName(name: string) {
    const agent = await prisma.agent.findUnique({
      where: { name },
    });
    return agent;
  }

  async create(data: CreateAgentInput) {
    const agent = await prisma.agent.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        systemPrompt: data.systemPrompt,
        avatar: data.avatar,
        providerId: data.providerId,
        agentUrl: data.agentUrl,
        agentType: data.agentType,
        slashCommand: data.slashCommand,
        webViewUrl: data.webViewUrl,
      },
    });
    return agent;
  }

  async update(id: string, data: UpdateAgentInput) {
    // Build update data, explicitly handling providerId to allow null
    const updateData: Record<string, unknown> = {};
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.providerId !== undefined) updateData.providerId = data.providerId;
    if (data.agentUrl !== undefined) updateData.agentUrl = data.agentUrl;
    if (data.agentType !== undefined) updateData.agentType = data.agentType;
    if (data.slashCommand !== undefined) updateData.slashCommand = data.slashCommand;
    if (data.webViewUrl !== undefined) updateData.webViewUrl = data.webViewUrl;

    const agent = await prisma.agent.update({
      where: { id },
      data: updateData,
    });
    return agent;
  }

  async delete(id: string) {
    await prisma.agent.delete({
      where: { id },
    });
  }
}

export const agentService = new AgentService();