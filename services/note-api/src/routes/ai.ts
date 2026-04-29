import { FastifyPluginAsync } from 'fastify';
import { marked } from 'marked';
import { getAgentPrompt, callLLM } from '../lib/llm.js';

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/ai/edit', async (request, reply) => {
    try {
      const { text, instruction } = request.body as { text: string; instruction: string };
      const prompts = getAgentPrompt('edit');
      if (!prompts) throw new Error('Agent not loaded');

      const systemPrompt = `${prompts.agent}\n\n${prompts.skill}`;
      const userPrompt = `Selected text:\n${text}\n\nInstruction: ${instruction}\n\nEdit the selected text according to the instruction. Return only the edited text.`;

      const content = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const html = await marked.parse(content.trim(), { async: true });

      return { success: true, content: html };
    } catch (err: any) {
      console.error('[AI Edit Error]', err);
      reply.status(500);
      return { success: false, error: err.message || 'AI edit failed' };
    }
  });

  fastify.post('/api/ai/complete', async (request, reply) => {
    try {
      const { textBefore, textAfter } = request.body as { textBefore: string; textAfter: string };
      const prompts = getAgentPrompt('complete');
      if (!prompts) throw new Error('Agent not loaded');

      const systemPrompt = `${prompts.agent}\n\n${prompts.skill}`;
      const userPrompt = `Context before cursor:\n${textBefore}\n\nContext after cursor:\n${textAfter}\n\nContinue the text naturally from where the cursor is.`;

      const completion = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      // Convert markdown to HTML for Novel editor
      const html = await marked.parse(completion.trim(), { async: true });

      return { success: true, completion: html };
    } catch (err: any) {
      console.error('[AI Complete Error]', err);
      reply.status(500);
      return { success: false, error: err.message || 'AI completion failed' };
    }
  });

  fastify.post('/api/ai/generate', async (request, reply) => {
    try {
      const { prompt, context } = request.body as { prompt: string; context?: string };
      const prompts = getAgentPrompt('generate');
      if (!prompts) throw new Error('Agent not loaded');

      const systemPrompt = `${prompts.agent}\n\n${prompts.skill}`;
      const userPrompt = context
        ? `Existing document context:\n${context}\n\nUser request: ${prompt}\n\nGenerate content that fits into the document.`
        : `User request: ${prompt}\n\nGenerate the requested content.`;

      const content = await callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      // Convert markdown to HTML for Novel editor
      const html = await marked.parse(content.trim(), { async: true });

      return { success: true, content: html };
    } catch (err: any) {
      console.error('[AI Generate Error]', err);
      reply.status(500);
      return { success: false, error: err.message || 'AI generation failed' };
    }
  });
};

export default aiRoutes;
