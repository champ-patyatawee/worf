import { Request, Response } from 'express';
import { aiProviderService } from '../services/aiProviderService';

export class AIProviderController {
  async getProviders(_req: Request, res: Response) {
    try {
      const providers = await aiProviderService.list();
      res.json({ success: true, data: providers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const provider = await aiProviderService.get(id);
      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider not found' });
      }
      res.json({ success: true, data: provider });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createProvider(req: Request, res: Response) {
    try {
      const { name, provider, apiUrl, apiKey, model, isDefault } = req.body;
      
      if (!name || !provider || !apiUrl || !apiKey || !model) {
        return res.status(400).json({
          success: false,
          error: 'name, provider, apiUrl, apiKey, and model are required',
        });
      }

      const result = await aiProviderService.create({
        name,
        provider,
        apiUrl,
        apiKey,
        model,
        isDefault,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, provider, apiUrl, apiKey, model, isActive, isDefault } = req.body;

      const result = await aiProviderService.update(id, {
        name,
        provider,
        apiUrl,
        apiKey,
        model,
        isActive,
        isDefault,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteProvider(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await aiProviderService.delete(id);
      res.json({ success: true, message: 'Provider deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const aiProviderController = new AIProviderController();