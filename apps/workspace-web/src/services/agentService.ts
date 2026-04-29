import { parseAgentMessage } from '../utils/agentParser';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('workspace-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

/**
 * Chat with an agent (non-streaming)
 * @param agentName - e.g., "AgentKanban"
 * @param task - User's task message
 * @param history - Optional conversation history for context
 * @param onChunk - Callback for the response (called once)
 * @param threadId - Optional thread ID to save response as reply
 * @param channelId - Optional channel ID
 * @param isDM - If true, uses /dm endpoint for DM conversations
 * @param userId - Required for DM: the current user ID
 * @param recipientId - Required for DM: the agent's user ID
 * @returns Final complete response
 */
export async function streamAgentChat(
  agentName: string,
  task: string,
  history: { role: string; content: string }[] = [],
  onChunk: (chunk: string, done: boolean) => void,
  threadId?: string,
  channelId?: string,
  isDM?: boolean,
  userId?: string,
  recipientId?: string
): Promise<string> {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Use /dm endpoint for DM conversations
  const endpoint = isDM ? `/api/agents/${agentName}/dm` : `/api/agents/${agentName}/chat`;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ task, history, threadId, channelId, userId, recipientId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to chat with agent');
  }

  const result = await response.json();

  // Handle error response
  if (!result.success) {
    throw new Error(result.error || 'Failed to chat with agent');
  }

  const content = result.data?.content || '';
  
  // Call the callback with the full response
  onChunk(content, true);

  return content;
}

/**
 * Check and handle agent mentions in message
 * Returns agentName and task if detected, null otherwise
 */
export function detectAgentMention(
  content: string
): { agentName: string; task: string } | null {
  return parseAgentMessage(content);
}