// src/controllers/toolExecutionController.ts
import { Request, Response } from 'express';
import { getTool } from '../tools/registry';
import { loadToolConfig } from '../tools/config';

export class ToolExecutionController {
  /**
   * POST /api/tools/:toolName/execute — Execute a tool and return result
   */
  async executeTool(req: Request, res: Response) {
    try {
      const { toolName } = req.params;
      const { params } = req.body;

      if (!toolName) {
        return res.status(400).json({
          success: false,
          error: 'tool name is required',
        });
      }

      // 1. Get tool definition from registry
      const tool = getTool(toolName as string);
      if (!tool) {
        return res.status(404).json({
          success: false,
          error: `Tool '${toolName}' not found`,
        });
      }

      // 2. Load global tool config from DB
      const toolConfig = await loadToolConfig(toolName as string);

      // 3. Check tool is enabled globally
      if (!toolConfig.isEnabled) {
        return res.status(403).json({
          success: false,
          error: `Tool '${toolName}' is disabled`,
        });
      }

      // 4. Execute the tool handler
      const result = await tool.handler(
        (params as Record<string, unknown>) || {},
        toolConfig.config
      );

      // 5. Return the result
      res.json({
        success: true,
        data: {
          tool: toolName,
          ...result,
        },
      });
    } catch (error: any) {
      console.error('[ToolExecution] Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Tool execution failed',
        data: {
          tool: req.body?.tool,
          type: 'text',
          content: `❌ Error: ${error.message || 'Tool execution failed'}`,
          timing: 0,
        },
      });
    }
  }
}

export const toolExecutionController = new ToolExecutionController();
