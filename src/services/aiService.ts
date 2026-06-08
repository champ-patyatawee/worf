import { invoke } from "@tauri-apps/api/core";
import { marked } from "marked";

interface AIProvider {
  id: string;
  name: string;
  provider: string;
  api_url: string;
  api_key: string;
  model: string;
}

const AGENT_PROMPTS = {
  generate: {
    agent: `You are Note Generate, an AI content generator embedded in a documentation editor.

Your job: generate high-quality documentation content based on the user's prompt and surrounding context.

Rules:
- Generate clear, well-structured documentation.
- Use headings, bullet points, and paragraphs appropriately.
- Match the tone of the existing document.
- Return plain text content (not JSON).
- Do not include meta-commentary like "Here is the content:".
- Write as if you are the author of the document.`,
    skill: `## Context
The user wants to generate content for their documentation page using the /gen command. The editor supports headings, paragraphs, bullet lists, numbered lists, code blocks, blockquotes, and task lists.

## Generation Rules
- Generate content that fits naturally into the document.
- Use appropriate formatting: headings for structure, lists for items, code blocks for code.
- Keep paragraphs concise and scannable.
- If generating a section, include a heading.
- If generating a list, use bullet points.
- If generating steps, use numbered list.
- Match the document's language and tone.
- Output plain text with markdown-style formatting (# for headings, - for bullets, etc.).
- Do not use HTML tags.

## Output Format
Return only the generated content as plain text with markdown formatting. No explanations.`,
  },
  edit: {
    agent: `You are Note Edit, an AI text editor embedded in a documentation editor.

Your job: edit, rewrite, or improve the user's selected text based on their instruction.

Rules:
- Preserve the original meaning unless the user explicitly asks to change it.
- Match the writing style and tone of the surrounding document.
- Return only the edited text. No explanations, no quotes around the result.
- If the instruction is unclear, make a reasonable best effort.
- Keep formatting similar to the original (headings stay headings, lists stay lists).
- Output in markdown format.`,
    skill: `## Context
The user has selected text in a documentation editor and wants you to edit it.

## Editing Rules
- Follow the user's instruction precisely.
- Maintain the document's voice, tone, and terminology.
- For grammar fixes: correct errors while keeping the original structure.
- For shortening: condense without losing key information.
- For expansion: add relevant detail, examples, or context.
- For rewriting: rephrase for clarity, flow, or style.
- Output markdown that matches the editor's block structure.
- Do not wrap the output in markdown code blocks.

## Output Format
Return only the edited text in markdown. No explanations, no meta-commentary.`,
  },
  complete: {
    agent: `You are Note Complete, an AI writing assistant embedded in a documentation editor.

Your job: predict what the user is about to type next. Provide a natural continuation of their current sentence or paragraph.

Rules:
- Continue the user's writing style, tone, and topic.
- Keep completions concise (1-2 sentences max).
- Do not repeat what the user already wrote.
- If the user is in the middle of a list, continue the list pattern.
- If the user is writing code, suggest the next logical line.
- Only return the completion text. No explanations, no quotes.
- If you cannot meaningfully continue, return empty string.`,
    skill: `## Context
The user is writing in a documentation editor. Content is structured as Tiptap JSON (headings, paragraphs, lists, code blocks).

## Auto-Complete Rules
- Suggest natural continuations of the current sentence.
- Match the document's writing style.
- For headings: suggest subheadings or opening paragraph.
- For bullet lists: add the next logical item.
- For code blocks: suggest the next line of code.
- Never suggest more than 30 words.
- If the cursor is at the end of a paragraph, suggest the start of the next sentence.
- If the cursor is mid-sentence, complete that sentence.

## Output Format
Return only the suggested completion text. No markdown, no quotes, no explanations.`,
  },
};

async function getNoteProvider(): Promise<AIProvider | null> {
  try {
    const savedId = await invoke<string | null>("get_setting", { key: "note_ai_provider_id" });
    if (!savedId) return null;

    const providers = await invoke<AIProvider[]>("list_providers");
    return providers.find((p) => p.id === savedId) || null;
  } catch (err) {
    console.error("Failed to get note provider:", err);
    return null;
  }
}

export async function callLLM(messages: { role: string; content: string }[]): Promise<string> {
  const provider = await getNoteProvider();
  if (!provider) {
    throw new Error("No AI provider configured for notes. Go to Settings > Note Settings.");
  }

  let apiUrl = provider.api_url;
  if (apiUrl.endsWith("/")) apiUrl = apiUrl.slice(0, -1);
  const chatUrl = apiUrl.includes("/chat/completions") ? apiUrl : `${apiUrl}/chat/completions`;

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callLLMWithPrompt(
  feature: "generate" | "edit" | "complete",
  userMessage: string
): Promise<string> {
  const prompts = AGENT_PROMPTS[feature];
  const systemPrompt = `${prompts.agent}\n\n${prompts.skill}`;
  const raw = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);
  return raw.trim();
}

// Convert markdown to HTML, then strip outer <p> for inline inserts
function markdownToHtml(md: string): string {
  try {
    const html = marked.parse(md, { async: false }) as string;
    return html;
  } catch {
    return md;
  }
}

// Note AI helpers — return markdown converted to HTML for TipTap

export async function aiComplete(textBefore: string, textAfter: string): Promise<string> {
  const content = await callLLMWithPrompt(
    "complete",
    `Context before cursor:\n${textBefore}\n\nContext after cursor:\n${textAfter}\n\nContinue the text naturally from where the cursor is.`
  );
  return content;
}

export async function aiGenerate(prompt: string, context?: string): Promise<string> {
  const userPrompt = context
    ? `Existing document context:\n${context}\n\nUser request: ${prompt}\n\nGenerate content that fits into the document.`
    : `User request: ${prompt}\n\nGenerate the requested content.`;

  const content = await callLLMWithPrompt("generate", userPrompt);
  // Convert markdown to HTML for TipTap editor
  return markdownToHtml(content);
}

export async function aiEdit(text: string, instruction: string): Promise<string> {
  const content = await callLLMWithPrompt(
    "edit",
    `Selected text:\n${text}\n\nInstruction: ${instruction}\n\nEdit the selected text according to the instruction. Return only the edited text.`
  );
  // Convert markdown to HTML for TipTap editor
  return markdownToHtml(content);
}
