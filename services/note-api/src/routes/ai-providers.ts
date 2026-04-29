import { FastifyPluginAsync } from 'fastify';
import { getWorkspaceAIProviders, getDefaultWorkspaceAIProvider } from '../lib/workspace-db.js';
import prisma from '../lib/db.js';

const aiProviderRoutes: FastifyPluginAsync = async (fastify) => {
  // List providers from main workspace DB
  fastify.get('/api/ai-providers', async () => {
    const providers = await getWorkspaceAIProviders();
    return { success: true, data: providers };
  });

  // Get selected provider for Note (stored in docs DB)
  fastify.get('/api/settings/ai-provider', async () => {
    const setting = await prisma.aIProvider.findFirst({
      where: { isActive: true },
    });
    return { success: true, data: setting };
  });

  // Select which workspace provider to use for Note
  fastify.put('/api/settings/ai-provider', async (request) => {
    const { providerId } = request.body as { providerId: string };
    
    // Get full provider from workspace
    const { getWorkspaceAIProvider } = await import('../lib/workspace-db.js');
    const workspaceProvider = await getWorkspaceAIProvider(providerId);
    
    if (!workspaceProvider) {
      throw { statusCode: 404, message: 'Provider not found in workspace' };
    }

    // Clear existing
    await prisma.aIProvider.deleteMany({});

    // Store selected provider in docs DB
    const created = await prisma.aIProvider.create({
      data: {
        name: workspaceProvider.name,
        provider: workspaceProvider.provider,
        apiUrl: workspaceProvider.apiUrl,
        apiKey: workspaceProvider.apiKey,
        model: workspaceProvider.model,
        isActive: true,
        isDefault: true,
      },
    });

    return { success: true, data: created };
  });
};

export default aiProviderRoutes;
