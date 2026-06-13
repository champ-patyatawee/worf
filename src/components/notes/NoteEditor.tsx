import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  handleCommandNavigation,
  ImageResizer,
} from "novel";
import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor } from "novel";
import { useDebouncedCallback } from "use-debounce";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, Settings } from "lucide-react";
import { defaultExtensions } from "./extensions";
import { slashCommand, suggestionItems } from "./slash-command";
import { triggerNoteSidebarRefresh } from "./NoteSidebar";
import { NodeSelector } from "./NodeSelector";
import { TextButtons } from "./TextButtons";
import { Separator } from "../ui/separator";
import { GhostText } from "./GhostText";
import { GenerateInput } from "./GenerateInput";
import { AIEditInput } from "./AIEditInput";
import { useAICompletion } from "./useAICompletion";
import { invoke } from "@tauri-apps/api/core";
import type { Page } from "../../types";
import { aiGenerate, aiEdit } from "../../services/aiService";

const extensions = [...defaultExtensions, slashCommand];

function EditorRefSetter({ editorRef }: { editorRef: React.MutableRefObject<any> }) {
  const { editor } = useEditor();
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);
  return null;
}

export function NoteEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [pageTitle, setPageTitle] = useState("Untitled");
  const [openNode, setOpenNode] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatePos, setGeneratePos] = useState({ x: 0, y: 0 });
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [aiEditLoading, setAIEditLoading] = useState(false);
  const aiEditRangeRef = useRef<{ from: number; to: number } | null>(null);
  const editorRef = useRef<any>(null);
  const { ghostText, loading: ghostLoading } = useAICompletion();

  const loadPage = useCallback(async (s: string) => {
    try {
      // Try loading by slug first (for navigation), then by id
      let page: Page | null = null;
      try {
        // Check if slug is actually an id
        page = await invoke<Page>("get_page", { id: s });
      } catch {
        // Not found by id, try listing all pages for matching slug
        const pages = await invoke<Page[]>("list_pages");
        const rootPages = await invoke<Page[]>("list_pages_in_folder", { folderId: "__all__" }).catch(() => []);
        const allPages = [...pages, ...rootPages];
        const folders = await invoke<any[]>("list_folders");
        for (const folder of folders) {
          try {
            const fp = await invoke<Page[]>("list_pages_in_folder", { folderId: folder.id });
            allPages.push(...fp);
          } catch {}
        }
        page = allPages.find(p => p.slug === s) || null;
      }

      if (!page) {
        console.error("Page not found:", s);
        return;
      }

      // Validate content
      if (!page.content || page.content === "{}") {
        page.content = JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [] }],
        });
      }
      setCurrentPage(page);
      setPageTitle(page.title);
    } catch (err) {
      console.error("Failed to load page:", err);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      loadPage(slug);
    } else {
      setCurrentPage(null);
      setPageTitle("Untitled");
    }
  }, [slug, loadPage]);

  // Update editor content when page changes (without re-mounting the editor)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !currentPage) return;
    try {
      const parsed = JSON.parse(currentPage.content);
      if (parsed && typeof parsed === 'object') {
        editor.commands.setContent(parsed);
      }
    } catch {
      // content is plain text or invalid JSON, skip
    }
  }, [currentPage?.id]);

  // Listen for AI generate trigger from slash command
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.editor) {
        editorRef.current = detail.editor;
        const { from } = detail.editor.state.selection;
        const coords = detail.editor.view.coordsAtPos(from);
        setGeneratePos({ x: coords.left, y: coords.top });
        setShowGenerate(true);
      }
    };
    window.addEventListener("ai-generate-trigger", handler);
    return () => window.removeEventListener("ai-generate-trigger", handler);
  }, []);

  const handleGenerate = async (prompt: string) => {
    setGenerateLoading(true);
    setGenerateError("");
    try {
      const editor = editorRef.current;
      if (!editor) return;

      const context = editor.getText();
      const content = await aiGenerate(prompt, context);

      if (content) {
        editor.chain().focus().insertContent(content).run();
      }
      setShowGenerate(false);
    } catch (err: any) {
      console.error("AI generation failed:", err);
      setGenerateError(err.message || "AI generation failed");
    }
    setGenerateLoading(false);
  };

  const handleAIEdit = async (instruction: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const range = aiEditRangeRef.current;
    if (!range) return;

    const { from, to } = range;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    if (!selectedText.trim()) return;

    setAIEditLoading(true);
    try {
      const result = await aiEdit(selectedText, instruction);
      if (result) {
        let cleaned = result.trim();

        const node = editor.state.doc.nodeAt(from);
        const isCodeBlock =
          node?.type?.name === "codeBlock" ||
          editor.state.selection.$from.parent.type.name === "codeBlock";

        if (isCodeBlock) {
          cleaned = cleaned.replace(/<[^>]+>/g, "");
        } else if (cleaned.startsWith("<p>") && cleaned.endsWith("</p>")) {
          cleaned = cleaned.slice(3, -4).trim();
        }

        editor.chain().focus().insertContentAt({ from, to }, cleaned).run();
      }
      setShowAIEdit(false);
      aiEditRangeRef.current = null;
    } catch (err: any) {
      console.error("AI edit failed:", err);
    }
    setAIEditLoading(false);
  };

  // Novel GlobalDragHandle fix
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const handle = document.querySelector(".drag-handle");
      if (handle && handle.getAttribute("contenteditable") !== "false") {
        handle.setAttribute("contenteditable", "false");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const debouncedSave = useDebouncedCallback(async (id: string, content: any, title: string, pageSlug: string) => {
    try {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const updated = await invoke<any>("update_page", { id, title, content: contentStr });
      setSaveStatus("Saved");
      triggerNoteSidebarRefresh();
      if (updated.slug && updated.slug !== pageSlug) {
        navigate(`/notes/${updated.slug}`, { replace: true });
      }
    } catch (err) {
      console.error("Failed to save:", err);
      setSaveStatus("Error");
    }
  }, 300);

  const handleContentChange = (editor: any) => {
    if (!currentPage) return;
    setSaveStatus("Unsaved");
    debouncedSave(currentPage.id, editor.getJSON(), pageTitle, slug || currentPage.slug);
  };

  const debouncedTitleSave = useDebouncedCallback(async (id: string, title: string, pageSlug: string) => {
    try {
      const updated = await invoke<any>("update_page", { id, title, content: null });
      setSaveStatus("Saved");
      triggerNoteSidebarRefresh();
      // Only navigate if we're still on the same page (slug didn't change)
      if (updated.slug && updated.slug !== pageSlug) {
        navigate(`/notes/${updated.slug}`, { replace: true });
      }
    } catch (err) {
      console.error("Failed to save title:", err);
      setSaveStatus("Error");
    }
  }, 300);

  const handleTitleChange = (newTitle: string) => {
    setPageTitle(newTitle);
    if (!currentPage) return;
    setSaveStatus("Unsaved");
    debouncedTitleSave(currentPage.id, newTitle, slug || currentPage.slug);
  };

  // Parse initial content
  const getInitialContent = (): any => {
    if (!currentPage?.content) return undefined;
    try {
      return JSON.parse(currentPage.content);
    } catch {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: currentPage.content }] }],
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ backgroundColor: "var(--color-bg-primary)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b-2 flex-shrink-0"
        style={{ borderColor: "var(--color-border-primary)", backgroundColor: "var(--color-bg-primary)" }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {slug && currentPage ? (
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={async () => {
                if (!currentPage) return;
                const blurSlug = slug || currentPage.slug;
                try {
                  const updated = await invoke<any>("update_page", { id: currentPage.id, title: pageTitle, content: null });
                  setSaveStatus("Saved");
                  triggerNoteSidebarRefresh();
                  if (updated.slug && updated.slug !== blurSlug) {
                    navigate(`/notes/${updated.slug}`, { replace: true });
                  }
                } catch { setSaveStatus("Error"); }
              }}
              className="text-xl font-extrabold bg-transparent border-2 rounded-[var(--radius-md)] px-3 py-1.5 w-full max-w-xl transition-colors"
              style={{
                color: "var(--color-text-primary)",
                borderColor: "transparent",
                backgroundColor: "var(--color-bg-secondary)",
              }}
              placeholder="Untitled"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent-primary)";
              }}
              onMouseOut={(e) => {
                if (e.currentTarget !== document.activeElement) {
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            />
          ) : (
            <span className="text-xl font-extrabold" style={{ color: "var(--color-text-tertiary)" }}>Select a page</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold border-2 uppercase tracking-wide"
            style={{
              backgroundColor:
                saveStatus === "Saved"
                  ? "rgba(74, 222, 128, 0.15)"
                  : saveStatus === "Error"
                  ? "rgba(251, 113, 133, 0.15)"
                  : "rgba(250, 204, 21, 0.15)",
              borderColor: "var(--color-border-primary)",
              color:
                saveStatus === "Saved"
                  ? "var(--color-success)"
                  : saveStatus === "Error"
                  ? "var(--color-error)"
                  : "var(--color-warning)",
            }}
          >
            {saveStatus}
          </span>
          <button
            onClick={() => navigate("/settings/ai")}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_#0D0D0D] active:translate-x-0 active:translate-y-0 active:shadow-none"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
            }}
            title="Settings"
          >
            <Settings className="h-4 w-4" style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto p-6 min-h-0 relative">
        {ghostLoading && (
          <div className="absolute top-2 right-4 z-30 text-xs font-medium animate-pulse" style={{ color: "var(--color-accent-primary)" }}>
            ...
          </div>
        )}
        {currentPage ? (
          <div
            className="w-full max-w-4xl border-2 rounded-[var(--radius-lg)] overflow-hidden"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              borderColor: "var(--color-border-primary)",
              boxShadow: "4px 4px 0px #0D0D0D",
            }}
          >
            <EditorRoot>
              <EditorContent
                initialContent={getInitialContent()}
                extensions={extensions}
                className="relative min-h-full w-full"
                editorProps={{
                  handleDOMEvents: {
                    keydown: (_view: any, event: KeyboardEvent) => handleCommandNavigation(event),
                  },
                  attributes: {
                    class: `prose prose-lg prose-headings:font-title font-default focus:outline-none max-w-full px-12 py-8`,
                  },
                }}
                onUpdate={({ editor }: { editor: any }) => {
                  editorRef.current = editor;
                  handleContentChange(editor);
                }}
                slotAfter={<ImageResizer />}
              >
                <EditorRefSetter editorRef={editorRef} />
                <EditorBubble
                  tippyOptions={{
                    placement: "top",
                    onShow: () => setShowAIEdit(false),
                    onHidden: () => {
                      setOpenNode(false);
                    },
                  }}
                  className="flex w-fit max-w-[90vw] overflow-hidden rounded-[var(--radius-lg)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-md)] bg-[var(--color-bg-secondary)]"
                >
                  {showAIEdit ? (
                    <AIEditInput
                      onEdit={handleAIEdit}
                      onCancel={() => setShowAIEdit(false)}
                      loading={aiEditLoading}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const editor = editorRef.current;
                          if (editor) {
                            const { from, to } = editor.state.selection;
                            aiEditRangeRef.current = { from, to };
                          }
                          setShowAIEdit(true);
                        }}
                        className="px-2 py-1 text-sm font-medium flex items-center gap-1"
                        style={{ color: "var(--color-accent-primary)" }}
                        title="AI Edit"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI
                      </button>
                      <Separator orientation="vertical" className="h-9" style={{ backgroundColor: "var(--color-border-primary)" }} />
                      <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                      <Separator orientation="vertical" className="h-9" style={{ backgroundColor: "var(--color-border-primary)" }} />
                      <TextButtons />
                    </>
                  )}
                </EditorBubble>
                <EditorCommand
                  className="z-50 h-auto max-h-[330px] w-full px-1 py-2 rounded-[var(--radius-md)] border-2 shadow-[var(--shadow-md)] overflow-y-auto"
                  style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-primary)" }}
                >
                  <EditorCommandEmpty className="px-2" style={{ color: "var(--color-text-tertiary)" }}>No results</EditorCommandEmpty>
                  <EditorCommandList>
                    {suggestionItems.map((item) => (
                      <EditorCommandItem
                        value={item.title}
                        onCommand={(val: any) => item.command?.(val)}
                        className="flex w-full items-center space-x-2 rounded-[var(--radius-md)] px-2 py-1 text-left text-sm hover:bg-[var(--color-bg-hover)] transition-colors"
                        style={{ color: "var(--color-text-primary)" }}
                        key={item.title}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border-2"
                          style={{ borderColor: "var(--color-border-primary)", backgroundColor: "var(--color-bg-tertiary)" }}
                        >
                          {item.icon}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.title}</p>
                          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.description}</p>
                        </div>
                      </EditorCommandItem>
                    ))}
                  </EditorCommandList>
                </EditorCommand>
              </EditorContent>
            </EditorRoot>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div
              className="text-center border-2 rounded-[var(--radius-lg)] p-10 max-w-md"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-primary)",
                boxShadow: "4px 4px 0px #0D0D0D",
              }}
            >
              <div
                className="w-12 h-12 mx-auto mb-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: "var(--color-border-primary)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--color-text-tertiary)" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>No page selected</p>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Select a page from the sidebar or create a new one</p>
            </div>
          </div>
        )}

        {/* AI Generate Input */}
        {showGenerate && (
          <div className="fixed z-50" style={{ left: generatePos.x, top: generatePos.y }}>
            <GenerateInput
              onGenerate={handleGenerate}
              onCancel={() => { setShowGenerate(false); setGenerateError(""); }}
              loading={generateLoading}
              error={generateError}
            />
          </div>
        )}

        {/* Ghost Text */}
        {editorRef.current && (
          <GhostText text={ghostText} editor={editorRef.current} />
        )}
      </div>
    </div>
  );
}
