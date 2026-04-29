import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import prisma from './db.js';
import { getDefaultWorkspaceAIProvider } from './workspace-db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_DIR = join(__dirname, '..', '..', 'setting');

let AGENTS: Record<string, { agent: string; skill: string }> = {};

export function loadAgents() {
  const features = ['complete', 'generate', 'edit'];
  for (const feature of features) {
    try {
      const agent = readFileSync(join(PROMPT_DIR, 'agent', `${feature}.md`), 'utf-8');
      const skill = readFileSync(join(PROMPT_DIR, 'skill', `${feature}.md`), 'utf-8');
      AGENTS[feature] = { agent, skill };
      console.log(`[AI] Loaded agent: ${feature}`);
    } catch (err) {
      console.error(`[AI] Failed to load agent: ${feature}`, err);
    }
  }
}

export function getAgentPrompt(feature: string) {
  return AGENTS[feature];
}

export async function getActiveProvider() {
  // First check if user selected a provider in Note settings
  const local = await prisma.aIProvider.findFirst({
    where: { isActive: true },
  });
  if (local) return local;

  // Fallback to workspace default
  return getDefaultWorkspaceAIProvider();
}

export async function callLLM(messages: { role: string; content: string }[], maxTokens?: number): Promise<string> {
  const provider = await getActiveProvider();
  if (!provider) {
    throw new Error('No AI provider configured');
  }

  // Build URL - handle various apiUrl formats
  let apiUrl = provider.apiUrl;
  if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
  }
  const chatUrl = apiUrl.includes('/chat/completions') ? apiUrl : `${apiUrl}/chat/completions`;

  console.log(`[LLM] Calling ${chatUrl} with model ${provider.model}${maxTokens ? ', maxTokens=' + maxTokens : ''}`);

  const body: any = {
    model: provider.model,
    messages,
    temperature: 0.7,
  };
  
  // Only set max_tokens if explicitly provided
  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  const response = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[LLM] Error ${response.status}: ${err}`);
    throw new Error(`LLM API error: ${response.status} ${err}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || '';
}
