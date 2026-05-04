// src/controllers/toolConfigController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getAllTools, getTool } from '../tools/registry';
import { loadToolConfig } from '../tools/config';

export class ToolConfigController {
  /**
   * GET /api/tools — List all tools + their global config
   */
  async getTools(_req: Request, res: Response) {
    try {
      const tools = getAllTools();
      const results = await Promise.all(
        tools.map(async (tool: { name: string; displayName: string; description: string; icon: string; inputSchema: any; defaultConfig: any }) => ({
          name: tool.name,
          displayName: tool.displayName,
          description: tool.description,
          icon: tool.icon,
          inputSchema: tool.inputSchema,
          defaultConfig: tool.defaultConfig,
          ...(await loadToolConfig(tool.name)),
        }))
      );

      res.json({ success: true, data: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/tools/:toolName/config — Update global config for a tool
   */
  async updateToolConfig(req: Request, res: Response) {
    try {
      const { toolName } = req.params;
      const { isEnabled, config } = req.body;

      // Check tool exists in registry
      const tool = getTool(toolName);
      if (!tool) {
        return res
          .status(404)
          .json({
            success: false,
            error: `Tool '${toolName}' not found`,
          });
      }

      const result = await prisma.toolConfig.upsert({
        where: { toolName },
        update: {
          ...(isEnabled !== undefined && { isEnabled }),
          ...(config !== undefined && { config }),
        },
        create: {
          toolName,
          isEnabled: isEnabled ?? true,
          config: config ?? tool.defaultConfig,
        },
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const toolConfigController = new ToolConfigController();
