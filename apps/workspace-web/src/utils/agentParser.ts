/**
 * Parse agent mention from message
 * @example "@AgentKanban create task" → { agentName: "AgentKanban", task: "create task" }
 */
export function parseAgentMessage(message: string): { agentName: string; task: string } | null {
  const trimmed = message.trim();
  
  // Must start with @
  if (!trimmed.startsWith('@')) {
    return null;
  }
  
  // Extract agent name (first word after @) and task (rest of message)
  const match = trimmed.match(/^@(\w+)\s+(.+)$/);
  
  if (!match) {
    return null;
  }
  
  return {
    agentName: match[1],  // e.g., "AgentKanban"
    task: match[2].trim(), // e.g., "create task"
  };
}

/**
 * Check if message is an agent mention
 */
export function isAgentMention(message: string): boolean {
  const trimmed = message.trim();
  return /^@\w+\s+.+$/.test(trimmed);
}

/**
 * Extract just the agent name from mention
 */
export function extractAgentName(message: string): string | null {
  const match = message.trim().match(/^@(\w+)/);
  return match ? match[1] : null;
}