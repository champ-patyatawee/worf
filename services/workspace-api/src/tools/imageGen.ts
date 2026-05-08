import { registerTool, type ToolDefinition } from './registry';
import { PrismaClient } from '@prisma/client';
import { imageService } from '../services/imageService';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function imageGenHandler(
  params: Record<string, unknown>,
  config: Record<string, unknown>
) {
  const startTime = Date.now();
  const prompt = params.prompt as string;
  if (!prompt) throw new Error('Prompt is required');

  const providerId = config.providerId as string;
  const userId = (params.userId as string) || 'system';
  const imageUrls = (params.imageUrls as string[]) || [];
  const inputImages = imageUrls.map(urlToBase64);

  // Look up the configured provider, or fall back to first active provider
  let provider = providerId
    ? await prisma.aIProvider.findUnique({ where: { id: providerId } })
    : null;
  if (!provider) {
    provider = await prisma.aIProvider.findFirst({ where: { isActive: true } });
  }

  const model = provider?.model;
  const apiKey = provider?.apiKey;
  const apiUrl = provider?.apiUrl;

  if (!model) throw new Error('Provider has no model configured. Go to Settings > AI Provider.');
  if (!apiKey || !apiUrl) throw new Error('Provider not fully configured.');

  // Generate image via chat completions endpoint
  const imageUrl = await generateViaChatEndpoint(apiUrl, apiKey, model, prompt, inputImages);

  if (!imageUrl) throw new Error('No image URL returned from provider');

  // Download the generated image from the external URL
  console.log(`[ImageGen] Downloading from: ${imageUrl.slice(0, 60)}...`);
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to download image: ${imageRes.statusText}`);
  }
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

  // Upload to our own server — saves locally + creates ChatImage record
  const uploaded = await imageService.uploadImage(imageBuffer, userId);

  return {
    type: 'image' as const,
    content: `![Generated Image](${uploaded.url})\n\n_${prompt}_`,
    data: {
      imageUrl: uploaded.url,
      prompt,
      model,
      imageId: uploaded.id,
    },
    timing: Date.now() - startTime,
  };
}

/**
 * Convert a local image URL (/uploads/images/xxx.jpg) to a base64 data URL
 * by reading the file from disk.
 */
function urlToBase64(imageUrl: string): string {
  const filename = path.basename(imageUrl);
  const filepath = path.join(process.cwd(), 'uploads', 'images', filename);
  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Generate an image using the chat completions endpoint.
 * Works with providers like OpenRouter that return images via chat.
 * The apiUrl from provider config is already the full chat completions URL.
 * Supports optional inputImages (base64 data URLs) for image-to-image models like Seedream.
 */
async function generateViaChatEndpoint(
  apiUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  inputImages: string[] = []
): Promise<string> {
  console.log(`[ImageGen] Chat completions endpoint: ${apiUrl} (${inputImages.length} input images)`);

  // Build message content: text + optional images
  const content = inputImages.length > 0
    ? [
        { type: 'text', text: prompt },
        ...inputImages.map(url => ({ type: 'image_url', image_url: { url } })),
      ]
    : prompt;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    // If this is a 404 NotFound, the provider doesn't support image gen via chat
    if (response.status === 404) {
      throw new Error(
        'Provider does not support image generation. ' +
        'Try using a dedicated image model (e.g. dall-e-3, seedream, stable-diffusion).'
      );
    }
    throw new Error(`Chat API error (${response.status}): ${error}`);
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | null;
        images?: Array<{
          type?: string;
          image_url?: { url?: string };
        }>;
      };
    }>;
  };

  const message = data.choices?.[0]?.message;

  // Check for OpenRouter-style images array in the message
  if (message?.images && message.images.length > 0) {
    const url = message.images[0]?.image_url?.url;
    if (url) return url;
  }

  // Check if the assistant returned a markdown image URL in its content
  if (message?.content) {
    const markdownMatch = message.content.match(/!\[.*?\]\((.*?)\)/);
    if (markdownMatch) return markdownMatch[1];

    // Check if content itself is a URL
    const urlMatch = message.content.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) return urlMatch[0];
  }

  throw new Error('No image found in chat completions response');
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

You can generate images from text descriptions.

### CRITICAL RULE — You MUST follow this
The generated image is **automatically displayed** in the chat by the system. Your response must NEVER contain image URLs, markdown images (![]()), or image references. The system shows the image for you. Only discuss the image with text.

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
