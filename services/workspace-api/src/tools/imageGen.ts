import { registerTool, type ToolDefinition } from './registry';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function imageGenHandler(
  params: Record<string, unknown>,
  config: Record<string, unknown>
) {
  const startTime = Date.now();
  const prompt = params.prompt as string;
  if (!prompt) throw new Error('Prompt is required');

  const providerId = config.providerId as string;

  const provider = providerId
    ? await prisma.aIProvider.findUnique({ where: { id: providerId } })
    : null;

  const model = provider?.model;
  const apiKey = provider?.apiKey;
  const apiUrl = provider?.apiUrl;

  if (!model) throw new Error('Provider has no model configured. Go to Settings > AI Provider.');
  if (!apiKey || !apiUrl) throw new Error('Provider not fully configured.');

  const response = await fetch(`${apiUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model, n: 1 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image API error: ${error}`);
  }

  const data = await response.json() as { data?: Array<{ url?: string; revised_prompt?: string }> };
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned from API');

  return {
    type: 'image' as const,
    content: `![Generated Image](${imageUrl})\n\n_${prompt}_`,
    data: {
      imageUrl,
      prompt: data.data?.[0]?.revised_prompt || prompt,
      model,
    },
    timing: Date.now() - startTime,
  };
}

export const imageGenTool: ToolDefinition = {
  name: 'image_gen',
  displayName: 'Image Gen',
  description: 'Generate images from text descriptions using AI.',
  icon: '🎨',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Describe the image you want to generate',
      },
    },
    required: ['prompt'],
  },
  defaultConfig: {
    providerId: '',
  },
  skill: `## Image Generation Tool

You have access to the **Image Gen** tool which can generate images from text descriptions.

### When to use it
- The user asks you to create, draw, or generate an image
- A visual illustration would help explain a concept

### How it works
The system sends your description to an AI image model and returns the image in the chat.

### Best practices
- Write detailed, descriptive prompts with subject and style
- If the user's request is vague, ask clarifying questions`,
  handler: imageGenHandler,
};

registerTool(imageGenTool);
