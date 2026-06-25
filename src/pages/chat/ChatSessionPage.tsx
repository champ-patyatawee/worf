import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Persist last session across tab switches
let _persistedSessionId: string | null = null;
import { invoke } from "@tauri-apps/api/core";
import { MessageList, ChatMessageInput } from "../../components/chat";
import { chatSessionStore } from "../../stores/chatSessionStore";
import { promptTemplateStore } from "../../stores/promptTemplateStore";
import { Bot, Settings2, X } from "lucide-react";
import { Select } from "../../components/ui/select";

export function ChatSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [renderKey, setRenderKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    const unsub = chatSessionStore.subscribe(() => setRenderKey((k) => k + 1));
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      await chatSessionStore.fetchSessions();
      await promptTemplateStore.fetchTemplates();
      try {
        const p = await invoke<any[]>("list_providers");
        setProviders(p.filter((pr: any) => pr.is_active));
      } catch {}
      setTemplates(promptTemplateStore.templates);
    })();
  }, []);

  // Restore persisted session on mount
  useEffect(() => {
    if (!sessionId && _persistedSessionId) {
      navigate(`/ai-chat/${_persistedSessionId}`, { replace: true });
    }
  }, []);

  // Expose setter so other components (e.g. Dashboard widget) can clear it
  (window as any).__setPersistedSessionId = (id: string | null) => {
    _persistedSessionId = id;
  };

  useEffect(() => {
    if (sessionId) {
      _persistedSessionId = sessionId;
      chatSessionStore.setActiveSession(sessionId);
      chatSessionStore.fetchMessages(sessionId);
      const s = chatSessionStore.sessions.find((s) => s.id === sessionId);
      if (s) { setSelectedModel(s.model_id || ""); setSelectedTemplate(s.prompt_template_id || ""); }
    } else {
      chatSessionStore.setActiveSession(null);
    }
  }, [sessionId]);

  const messages = chatSessionStore.messages;
  const isSending = sessionId ? chatSessionStore.isSessionSending(sessionId) : false;
  const isFetchingUrl = chatSessionStore.isFetchingUrl;
  const hasMore = chatSessionStore.hasMore;
  const error = chatSessionStore.error;
  const session = chatSessionStore.sessions.find((s) => s.id === sessionId);

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;
    await chatSessionStore.sendMessage(sessionId, content, selectedModel || undefined);
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    if (sessionId) chatSessionStore.updateSession(sessionId, { model_id: value || undefined });
  };

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    if (sessionId) chatSessionStore.updateSession(sessionId, { prompt_template_id: value || undefined });
  };

  const handleLoadOlder = useCallback(() => {
    if (!sessionId || chatSessionStore.isLoadingMore || !hasMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    chatSessionStore.fetchMoreMessages(sessionId, oldest.created_at);
  }, [sessionId, messages, hasMore]);

  if (!sessionId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--color-text-tertiary)" }} />
          <p className="text-lg font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>AI Chat</p>
          <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>Select a chat or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: "var(--color-bg-secondary)" }}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 flex-shrink-0"
        style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)" }}>
        <div className="w-8 h-8 rounded-[var(--radius-md)] border-2 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)", boxShadow: "2px 2px 0px #0D0D0D" }}>
          <Bot className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
        </div>
        <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
          {session?.title || "AI Chat"}
        </span>
        <div className="flex-1" />
        {isFetchingUrl && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)] border-2"
            style={{ backgroundColor: "var(--color-bg-tertiary)", borderColor: "var(--color-border-primary)" }}>
            <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border-primary)", borderTopColor: "var(--color-accent-primary)" }} />
            <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Reading webpage...</span>
          </div>
        )}
        {error && <span className="text-xs font-bold" style={{ color: "var(--color-error)" }}>{error}</span>}
        <button onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-[var(--radius-md)] border-2 transition-colors"
          style={{ color: showSettings ? "var(--color-accent-primary)" : "var(--color-text-tertiary)", backgroundColor: showSettings ? "var(--color-accent-subtle)" : "transparent", borderColor: showSettings ? "var(--color-border-primary)" : "transparent" }}>
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {showSettings && (
        <>
          <div className="fixed inset-0 z-30" style={{ backgroundColor: "rgba(0,0,0,0.2)" }} onClick={() => setShowSettings(false)} />
          <div className="fixed top-0 right-0 z-40 h-full w-72 border-l-2 p-4 animate-slideIn"
            style={{ backgroundColor: "var(--color-bg-primary)", borderColor: "var(--color-border-primary)", boxShadow: "-4px 0 12px rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Chat Settings</span>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-[var(--color-bg-hover)]">
                <X className="w-4 h-4" style={{ color: "var(--color-text-tertiary)" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Model</label>
                <Select
                  value={selectedModel}
                  onChange={handleModelChange}
                  options={[
                    { value: '', label: 'Default model' },
                    ...providers.map(p => ({ value: p.id, label: `${p.name} (${p.model})` }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Prompt Template</label>
                <Select
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                  placeholder="No template"
                  options={templates.map(t => ({ value: t.id, label: `${t.name}${t.is_default ? ' (default)' : ''}` }))}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <MessageList
        messages={messages}
        isLoading={false}
        hasMore={hasMore}
        isLoadingMore={chatSessionStore.isLoadingMore}
        onLoadOlder={handleLoadOlder}
      />

      <ChatMessageInput onSend={handleSendMessage} isSending={isSending} />
    </div>
  );
}
