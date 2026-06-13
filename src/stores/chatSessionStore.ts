import { invoke } from "@tauri-apps/api/core";

export interface ChatSession {
  id: string;
  title?: string;
  model_id?: string;
  prompt_template_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  error?: string;
}

export interface UrlContext {
  id: string;
  message_id: string;
  url: string;
  title: string;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  url_contexts?: FetchResult[];
}

// ── URL helpers ──

const URL_REGEX = /https?:\/\/[^\s<>"'\]\)`]+/g;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  // Deduplicate
  const unique = [...new Set(matches)];
  // Strip trailing punctuation from each URL
  return unique.map((url) => url.replace(/[.,;:!?)]+$/, ""));
}

// Check if a URL has already been fetched in existing messages
function hasUrlInHistory(url: string, msgs: ChatMessage[]): boolean {
  return msgs.some((m) =>
    m.url_contexts?.some((ctx) => ctx.url === url)
  );
}

function formatContextBlock(results: FetchResult[]): string {
  const parts = results
    .filter((r) => !r.error)
    .map(
      (r, i) =>
        `--- Page ${i + 1} ---\nURL: ${r.url}\nTitle: ${r.title}\nContent:\n${r.content}`
    );

  if (parts.length === 0) return "";

  return (
    `The user has shared the following webpages. Use this content to answer their questions accurately. Cite sources using [1], [2], etc. at relevant points.\n\n` +
    parts.join("\n\n")
  );
}

// ── Module-level store — no Zustand dependency ──
type Listener = () => void;
const listeners = new Set<Listener>();

let sessions: ChatSession[] = [];
let activeSessionId: string | null = null;
let messages: ChatMessage[] = [];
let isLoading = false;
let sendingSessions: Record<string, boolean> = {};
let isFetchingUrl = false;
let hasMore = false;
let isLoadingMore = false;
let error: string | null = null;

function emit() { listeners.forEach((l) => l()); }

function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return {}; }

export const chatSessionStore = {
  subscribe, getSnapshot,

  get sessions() { return sessions; },
  get activeSessionId() { return activeSessionId; },
  get messages() { return messages; },
  get isLoading() { return isLoading; },
  get isSending() { return Object.values(sendingSessions).some(v => v); },
  isSessionSending(sessionId: string): boolean {
    return !!sendingSessions[sessionId];
  },
  get isFetchingUrl() { return isFetchingUrl; },
  get hasMore() { return hasMore; },
  get isLoadingMore() { return isLoadingMore; },
  get error() { return error; },

  async fetchSessions() {
    isLoading = true; emit();
    try {
      sessions = await invoke<ChatSession[]>("list_chat_sessions");
    } catch (e: any) { error = e.message; }
    isLoading = false; emit();
  },

  async createSession(data?: { title?: string; model_id?: string; prompt_template_id?: string }) {
    const session = await invoke<ChatSession>("create_chat_session", {
      title: data?.title || null,
      modelId: data?.model_id || null,
      promptTemplateId: data?.prompt_template_id || null,
    });
    sessions = [session, ...sessions];
    activeSessionId = session.id;
    messages = [];
    emit();
    return session;
  },

  async updateSession(id: string, data: { title?: string; model_id?: string; prompt_template_id?: string }) {
    const updated = await invoke<ChatSession>("update_chat_session", {
      id, title: data.title || null, modelId: data.model_id || null, promptTemplateId: data.prompt_template_id || null,
    });
    sessions = sessions.map((s) => (s.id === id ? updated : s));
    emit();
  },

  async deleteSession(id: string) {
    await invoke("delete_chat_session", { id });
    sessions = sessions.filter((s) => s.id !== id);
    if (activeSessionId === id) { activeSessionId = null; messages = []; }
    emit();
  },

  setActiveSession(id: string | null) {
    activeSessionId = id;
    messages = [];
    emit();
  },

  async fetchMessages(sessionId: string) {
    const msgs = await invoke<ChatMessage[]>("get_chat_messages", { chatId: sessionId, before: null, limit: 11 });
    // Enrich messages with URL contexts
    for (const msg of msgs) {
      try {
        const contexts = await invoke<UrlContext[]>("get_url_contexts", { messageId: msg.id });
        if (contexts.length > 0) {
          msg.url_contexts = contexts.map((c) => ({
            url: c.url,
            title: c.title,
            content: c.content,
          }));
        }
      } catch { /* ignore — contexts may not exist for older messages */ }
    }
    hasMore = msgs.length > 10;
    messages = msgs.slice(-10); // keep 10 newest (chronological order, so last 10)
    emit();
  },

  async fetchMoreMessages(sessionId: string, before: string) {
    isLoadingMore = true; emit();
    const msgs = await invoke<ChatMessage[]>("get_chat_messages", { chatId: sessionId, before, limit: 20 });
    for (const msg of msgs) {
      try {
        const contexts = await invoke<UrlContext[]>("get_url_contexts", { messageId: msg.id });
        if (contexts.length > 0) {
          msg.url_contexts = contexts.map((c) => ({
            url: c.url,
            title: c.title,
            content: c.content,
          }));
        }
      } catch { /* ignore */ }
    }
    messages = [...msgs, ...messages];
    hasMore = msgs.length > 0;
    isLoadingMore = false; emit();
  },

  async sendMessage(sessionId: string, content: string, providerId?: string) {
    sendingSessions[sessionId] = true; error = null; emit();

    // ── Step 1: Detect URLs in message ──
    const urls = extractUrls(content);
    const newUrls = urls.filter((url) => !hasUrlInHistory(url, messages));
    let fetchedContexts: FetchResult[] = [];

    if (newUrls.length > 0) {
      isFetchingUrl = true; emit();
      try {
        const results = await invoke<FetchResult[]>("fetch_urls", { urls: newUrls });
        fetchedContexts = results;
        // Show error for failed URLs but don't block
        const failed = results.filter((r) => r.error);
        if (failed.length > 0) {
          console.warn("Failed to fetch some URLs:", failed.map((f) => `${f.url}: ${f.error}`));
        }
      } catch (e: any) {
        console.warn("URL fetch failed:", e.message);
        // Non-blocking — continue without context
      }
      isFetchingUrl = false; emit();
    }

    // Optimistic user message (with URL contexts if any)
    const optId = `opt-${Date.now()}`;
    const optMsg: ChatMessage = {
      id: optId,
      chat_id: sessionId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      url_contexts: fetchedContexts.length > 0 ? fetchedContexts : undefined,
    };
    messages = [...messages, optMsg];
    emit();

    try {
      // Save user message to backend
      const userMsg = await invoke<ChatMessage>("create_chat_message", { chatId: sessionId, role: "user", content });

      // Save URL contexts if any
      if (fetchedContexts.length > 0) {
        await invoke("save_url_contexts", { messageId: userMsg.id, contexts: fetchedContexts });
      }

      // Get AI response — call LLM directly from frontend
      const provider = await getProvider(providerId);
      if (!provider) throw new Error("No AI provider configured. Go to Settings > AI Provider.");

      // Build messages array with system prompt
      const sessionData = await invoke<any[]>("list_chat_sessions");
      const currentSession = sessionData.find((s: any) => s.id === sessionId);

      // Get prompt template if set
      let systemPrompt = "You are a helpful AI assistant. Always respond in the same language as the user's message.";
      if (currentSession?.prompt_template_id) {
        const templates = await invoke<any[]>("list_prompt_templates");
        const tpl = templates.find((t: any) => t.id === currentSession.prompt_template_id);
        if (tpl) systemPrompt = tpl.content;
      }

      const history = await invoke<ChatMessage[]>("get_chat_messages", { chatId: sessionId, before: null, limit: 50 });
      const apiMessages: { role: string; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      // Inject URL contexts as system message
      const contextBlock = formatContextBlock(fetchedContexts);
      if (contextBlock) {
        apiMessages.push({ role: "system", content: contextBlock });
      }

      // Add history — also inject URL contexts from history
      for (const m of history) {
        let msgContent = m.content;
        if (m.url_contexts && m.url_contexts.length > 0) {
          const histContextBlock = formatContextBlock(m.url_contexts);
          if (histContextBlock) {
            msgContent = `[Previously shared webpage context]\n${histContextBlock}\n\nUser message: ${m.content}`;
          }
        }
        apiMessages.push({ role: m.role, content: msgContent });
      }

      const response = await fetch(provider.api_url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: provider.model, messages: apiMessages, stream: true }),
      });

      if (!response.ok) throw new Error(`AI API error: ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      // Replace optimistic with real user message (attach URL contexts)
      const enrichedUserMsg: ChatMessage = {
        ...userMsg,
        url_contexts: fetchedContexts.length > 0 ? fetchedContexts : undefined,
      };
      messages = messages.map((m) => (m.id === optId ? enrichedUserMsg : m));
      emit();

      // Stream assistant message
      const streamMsgId = `stream-${Date.now()}`;
      messages = [...messages, { id: streamMsgId, chat_id: sessionId, role: "assistant", content: "", created_at: new Date().toISOString() }];
      emit();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const chunk = parsed.choices?.[0]?.delta?.content || "";
              fullContent += chunk;
              messages = messages.map((m) => (m.id === streamMsgId ? { ...m, content: fullContent } : m));
              emit();
            } catch {}
          }
        }
      }

      // Save assistant message
      if (fullContent) {
        const assistantMsg = await invoke<ChatMessage>("create_chat_message", { chatId: sessionId, role: "assistant", content: fullContent });
        messages = messages.map((m) => (m.id === streamMsgId ? assistantMsg : m));
      }

      // Refresh sessions to get auto-generated title
      await chatSessionStore.fetchSessions();

    } catch (e: any) {
      error = e.message;
      delete sendingSessions[sessionId];
      messages = messages.filter((m) => !m.id.startsWith("opt-") && !m.id.startsWith("stream-"));
    }
    delete sendingSessions[sessionId]; emit();
  },
};

async function getProvider(providerId?: string): Promise<{ api_url: string; api_key: string; model: string } | null> {
  try {
    const providers = await invoke<any[]>("list_providers");
    let p = providerId ? providers.find((pr) => pr.id === providerId) : null;
    if (!p) p = providers.find((pr) => pr.is_active);
    if (!p) return null;
    let url = p.api_url;
    if (!url.includes("/chat/completions")) url = url.replace(/\/?$/, "/chat/completions");
    return { api_url: url, api_key: p.api_key, model: p.model };
  } catch { return null; }
}
