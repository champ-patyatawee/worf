// src/tools/webfetch.ts
import { registerTool, type ToolDefinition } from './registry';

async function webfetchHandler(
  params: Record<string, unknown>,
  config: Record<string, unknown>
) {
  const startTime = Date.now();
  const url = params.url as string;

  if (!url) {
    throw new Error('URL is required');
  }

  const maxChars =
    (params.maxChars as number) || (config.maxChars as number) || 10000;
  const timeout =
    (params.timeout as number) || (config.timeout as number) || 15000;
  const userAgent =
    (config.userAgent as string) || 'Worf-Tool/1.0';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    // Strip HTML tags, scripts, styles
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const truncated =
      text.length > maxChars
        ? text.substring(0, maxChars) +
          `\n\n_[content truncated to ${maxChars.toLocaleString()} characters]_`
        : text;

    const timing = Date.now() - startTime;

    return {
      type: 'text' as const,
      content: `## ${title}\n\n${truncated}\n\n---\n_Fetched ${text.length.toLocaleString()} chars · ${timing}ms_`,
      data: {
        url,
        title,
        charsFetched: text.length,
        truncated: text.length > maxChars,
      },
      timing,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const webfetchTool: ToolDefinition = {
  name: 'webfetch',
  displayName: 'Web Fetch',
  description: 'Fetch URL content as readable text, stripping HTML tags.',
  icon: '🔗',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch content from',
      },
      maxChars: {
        type: 'number',
        description: 'Maximum number of characters to return',
        default: 10000,
      },
    },
    required: ['url'],
  },
  defaultConfig: {
    maxChars: 10000,
    timeout: 15000,
    userAgent: 'Worf-Tool/1.0',
  },
  skill: `## Web Fetch Tool

You have access to the **Web Fetch** tool which can retrieve content from web pages.

### When to use it
- The user shares a URL and asks what the page contains
- The user asks a question that requires information from a specific webpage
- You need to verify, extract, or summarize content from a link

### How it works
The system automatically detects URLs in the user's message. When a URL is present, the page content is fetched and included in your context as:

\`\`\`
[Web Fetch Result — page content fetched for context]:
Title: Page Title
...page content...
\`\`\`

### Best practices
- When the user provides a URL, read the fetched content before answering
- Use the page title and content to give accurate, informed responses
- If the content is truncated, summarize what's available and mention the page source
- If fetching fails, let the user know the page couldn't be accessed
`,
  handler: webfetchHandler,
};

// Auto-register on import
registerTool(webfetchTool);
