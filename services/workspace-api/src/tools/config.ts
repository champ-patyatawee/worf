// src/tools/config.ts
import { prisma } from '../config/database';
import { getTool, getAllTools, type ToolDefinition } from './registry';

export interface ToolConfigData {
  toolName: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Load the global config for a specific tool from the DB.
 * Falls back to the tool's defaultConfig if no DB record exists.
 */
export async function loadToolConfig(
  toolName: string
): Promise<ToolConfigData> {
  const tool = getTool(toolName);

  try {
    const dbConfig = await prisma.toolConfig.findUnique({
      where: { toolName },
    });

    if (dbConfig) {
      return {
        toolName: dbConfig.toolName,
        isEnabled: dbConfig.isEnabled,
        config: {
          ...(tool?.defaultConfig || {}),
          ...(dbConfig.config as Record<string, unknown>),
        },
      };
    }
  } catch (err) {
    console.error(
      `[ToolConfig] Failed to load config for ${toolName}:`,
      err
    );
  }

  // Fallback: return tool defaults
  return {
    toolName,
    isEnabled: true,
    config: tool?.defaultConfig || {},
  };
}

/**
 * Load configs for all registered tools.
 */
export async function loadAllToolConfigs(): Promise<ToolConfigData[]> {
  const tools = getAllTools();
  const configs = await Promise.all(
    tools.map((t: ToolDefinition) => loadToolConfig(t.name))
  );
  return configs;
}
