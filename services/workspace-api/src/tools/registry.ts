// src/tools/registry.ts

export interface ToolDefinition {
  name: string; // "webfetch"
  displayName: string; // "Web Fetch"
  description: string; // "Fetch URL content as readable text"
  icon: string; // "🔗"

  // Schema for dynamic form rendering + LLM function definition
  inputSchema: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        default?: unknown;
        enum?: string[];
      }
    >;
    required: string[];
  };

  // Default config (overridable in ToolConfig DB)
  defaultConfig: Record<string, unknown>;

  // Skill documentation — markdown injected into agent's system prompt when tool is enabled
  skill: string;

  // The handler function
  handler: (
    params: Record<string, unknown>,
    config: Record<string, unknown>
  ) => Promise<ToolResult>;
}

export function getToolSkills(enabledToolNames: string[]): string {
  const tools = getEnabledTools(enabledToolNames);
  return tools
    .map((t) => t.skill)
    .filter(Boolean)
    .join('\n\n');
}

export interface ToolResult {
  type: 'text' | 'image' | 'file' | 'html';
  content: string; // Markdown content for chat display
  data?: Record<string, unknown>; // Structured data for rich rendering
  timing?: number; // Execution time in ms
}

// In-memory tool registry
const toolRegistry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
  console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

export function getEnabledTools(enabledToolNames: string[]): ToolDefinition[] {
  return enabledToolNames
    .map((name) => toolRegistry.get(name))
    .filter((t): t is ToolDefinition => t !== undefined);
}
