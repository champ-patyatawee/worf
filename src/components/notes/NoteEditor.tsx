import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { X, Plus, Pin, PinOff, Loader2, Trash2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { noteStore, triggerSidebarRefresh } from "./noteStore";
import { NoteToolbar } from "./NoteToolbar";
import { BacklinksPanel } from "./BacklinksPanel";
import { WikilinkAutocomplete } from "./WikilinkAutocomplete";
import { generateSlug, preprocessWikilinks, buildNotesLookup, parseWikilinks } from "./noteHelpers";
import type { Note, NoteWithRelations, EditorMode, LinkInfo } from "./Types";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import mermaid from "mermaid";

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

// Module-level persisted editor mode
let _persistedMode: EditorMode =
  (typeof localStorage !== "undefined"
    ? (localStorage.getItem("notes-editor-mode") as EditorMode | null)
    : null) || "edit";

export function NoteEditor() {
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const st = noteStore.state;

  // ── Editor state ──
  const [mode, setMode] = useState<EditorMode>(_persistedMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showTagInput, setShowTagInput] = useState(false);

  // ── Search state ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Wikilink autocomplete state ──
  const [wikilinkOpen, setWikilinkOpen] = useState(false);
  const [wikilinkSearch, setWikilinkSearch] = useState("");
  const [wikilinkPosition, setWikilinkPosition] = useState({ top: 0, left: 0 });

  // ── Refs ──
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const activeNoteRef = useRef(st.activeNote);

  // Keep refs in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    activeNoteRef.current = st.activeNote;
  }, [st.activeNote]);

  // Subscribe to store
  useEffect(() => {
    const unsub = noteStore.subscribe(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  // Sync state when active note changes
  useEffect(() => {
    const active = st.activeNote;
    if (active && active.note) {
      setTitle(active.note.title);
      setContent(active.note.content);
      setTags(
        active.note.tags
          ? active.note.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : []
      );
    }
  }, [st.activeNote?.note?.id, st.activeNote?.note?.updated_at]);

  // Persist editor mode
  const handleChangeMode = useCallback((newMode: EditorMode) => {
    _persistedMode = newMode;
    localStorage.setItem("notes-editor-mode", newMode);
    setMode(newMode);
  }, []);

  // ── Auto-save ──
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const active = activeNoteRef.current;
      if (!active || !active.note) return;
      setSaving(true);
      const updates: Partial<Pick<Note, "title" | "content" | "tags">> = {};
      const currentTitle = titleRef.current;
      const currentContent = contentRef.current;

      if (currentTitle !== active.note.title) {
        updates.title = currentTitle;
      }
      if (currentContent !== active.note.content) {
        updates.content = currentContent;
      }

      if (Object.keys(updates).length > 0) {
        await noteStore.saveNote(active.note.id, updates);
        setLastSaved(new Date());
      }
      setSaving(false);
    }, 300);
  }, []);

  // ── Title handling ──
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      scheduleSave();
    },
    [scheduleSave]
  );

  const handleTitleBlur = useCallback(async () => {
    const active = st.activeNote;
    if (!active || !active.note) return;
    if (title !== active.note.title && title.trim()) {
      setSaving(true);
      await noteStore.saveNote(active.note.id, { title: title.trim() });
      // Navigate to new slug if title changed
      const newSlug = generateSlug(title.trim());
      if (newSlug !== active.note.slug) {
        navigate(`/notes/${newSlug}`, { replace: true });
      }
      setLastSaved(new Date());
      setSaving(false);
    }
  }, [title, st.activeNote, navigate]);

  // ── Content handling ──
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setContent(val);
      scheduleSave();

      // Detect [[ for wikilink autocomplete
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const textBefore = val.slice(0, cursorPos);
      const lastBracket = textBefore.lastIndexOf("[[");
      if (lastBracket !== -1) {
        const afterBracket = textBefore.slice(lastBracket + 2);
        // Don't autocomplete if there's a closing ]]
        if (!afterBracket.includes("]]")) {
          const rect = textarea.getBoundingClientRect();
          // Approximate cursor position
          const lineHeight = 20;
          const lines = textBefore.split("\n");
          const currentLine = lines.length;
          const lineWidth = lines[lines.length - 1].length * 8;
          setWikilinkPosition({
            top: rect.top + currentLine * lineHeight + 24,
            left: rect.left + Math.min(lineWidth, rect.width - 300) + 16,
          });
          setWikilinkSearch(afterBracket);
          setWikilinkOpen(true);
        } else {
          setWikilinkOpen(false);
        }
      } else {
        setWikilinkOpen(false);
      }

      // Debounced slug update on title-like first line
      if (!title.trim()) {
        const firstLine = val.split("\n")[0].replace(/^#+\s*/, "").trim();
        if (firstLine && firstLine.length < 60) {
          if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
          titleTimerRef.current = setTimeout(() => {
            setTitle(firstLine);
          }, 1500);
        }
      }
    },
    [scheduleSave, title]
  );

  // ── Tag handling ──
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setTagInput("");
      setShowTagInput(false);
      // Save tags
      const active = st.activeNote;
      if (active && active.note) {
        setSaving(true);
        noteStore.saveNote(active.note.id, { tags: newTags.join(",") }).then(() => {
          setSaving(false);
          setLastSaved(new Date());
        });
      }
    }
  }, [tagInput, tags, st.activeNote]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const newTags = tags.filter((t) => t !== tag);
      setTags(newTags);
      const active = st.activeNote;
      if (active && active.note) {
        setSaving(true);
        noteStore.saveNote(active.note.id, { tags: newTags.join(",") }).then(() => {
          setSaving(false);
          setLastSaved(new Date());
        });
      }
    },
    [tags, st.activeNote]
  );

  const handleTagInputKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === "Escape") {
        setShowTagInput(false);
        setTagInput("");
      }
    },
    [handleAddTag]
  );

  // ── Wikilink autocomplete handlers ──
  const handleWikilinkSelect = useCallback(
    (noteTitle: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const val = contentRef.current;
      const textBefore = val.slice(0, cursorPos);
      const lastBracket = textBefore.lastIndexOf("[[");
      if (lastBracket === -1) {
        setWikilinkOpen(false);
        return;
      }
      const beforeBracket = val.slice(0, lastBracket);
      const afterCursor = val.slice(cursorPos);
      const newContent = `${beforeBracket}[[${noteTitle}]]${afterCursor}`;
      setContent(newContent);
      contentRef.current = newContent;
      setWikilinkOpen(false);
      scheduleSave();

      // Focus back on textarea
      setTimeout(() => {
        textarea.focus();
        const newPos = lastBracket + noteTitle.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [scheduleSave]
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+F — open search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      // Cmd+S = save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        // Force save immediately
        const active = activeNoteRef.current;
        if (!active || !active.note) return;
        setSaving(true);
        noteStore
          .saveNote(active.note.id, {
            title: titleRef.current,
            content: contentRef.current,
          })
          .then(() => {
            setSaving(false);
            setLastSaved(new Date());
          });
      }
      // Tab = 2 spaces in textarea
      if (e.key === "Tab" && document.activeElement === textareaRef.current) {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = contentRef.current;
        const newVal = val.slice(0, start) + "  " + val.slice(end);
        setContent(newVal);
        contentRef.current = newVal;
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Pin toggle ──
  const handleTogglePin = useCallback(async () => {
    const active = st.activeNote;
    if (active && active.note) {
      await noteStore.togglePinNote(active.note.id);
    }
  }, [st.activeNote]);

  // ── Delete note ──
  const handleDelete = useCallback(async () => {
    const active = st.activeNote;
    if (!active || !active.note) return;
    if (confirm(`Delete "${active.note.title || "Untitled"}"?`)) {
      await noteStore.deleteNote(active.note.id);
      navigate("/notes");
    }
  }, [st.activeNote, navigate]);

  // ── Build notes lookup for wikilink preprocessing ──
  const notesLookup = useMemo(
    () => buildNotesLookup(st.notes),
    [st.notes]
  );

  // ── Search logic ──
  const findMatches = useCallback((text: string, query: string): number[] => {
    if (!query.trim() || !text) return [];
    const matches: number[] = [];
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    let idx = lower.indexOf(q);
    while (idx !== -1) {
      matches.push(idx);
      idx = lower.indexOf(q, idx + 1);
    }
    return matches;
  }, []);

  const navigateMatch = useCallback((direction: "next" | "prev") => {
    const matches = findMatches(content, searchQuery);
    if (matches.length === 0) return;

    let newIdx = currentMatch + (direction === "next" ? 1 : -1);
    if (newIdx >= matches.length) newIdx = 0;
    if (newIdx < 0) newIdx = matches.length - 1;

    setCurrentMatch(newIdx);

    // Select the match in textarea
    const ta = textareaRef.current;
    if (ta) {
      const pos = matches[newIdx];
      ta.focus();
      ta.setSelectionRange(pos, pos + searchQuery.length);
      // Scroll to the match
      const textBefore = content.substring(0, pos);
      const lines = textBefore.split("\n").length;
      const lineHeight = 20; // approximate
      ta.scrollTop = Math.max(0, (lines - 3) * lineHeight);
    }
  }, [content, searchQuery, currentMatch, findMatches]);

  // Update match count when search query changes
  useEffect(() => {
    const matches = findMatches(content, searchQuery);
    setTotalMatches(matches.length);
    if (currentMatch >= matches.length) setCurrentMatch(0);
  }, [content, searchQuery, findMatches, currentMatch]);

  // ── Preprocess content for preview ──
  const preprocessedContent = useMemo(
    () => preprocessWikilinks(content, notesLookup),
    [content, notesLookup]
  );

  // DEBUG: inspect raw content for code fence backticks
  console.log("[preview] content:", JSON.stringify(content.slice(0, 400)));

  // ── Render ──

  if (!st.activeNote || !st.activeNote.note) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-secondary)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-[var(--radius-lg)] border-2 flex items-center justify-center"
            style={{
              borderColor: "var(--color-border-primary)",
              backgroundColor: "var(--color-bg-tertiary)",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            Select a note
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Choose a note from the sidebar or create a new one
          </p>
        </div>
      </div>
    );
  }

  const activeNote = st.activeNote.note;
  const wordCount = activeNote.word_count || content.split(/\s+/).filter(Boolean).length;
  const createdDate = activeNote.created_at
    ? new Date(activeNote.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-secondary)" }}
    >
      {/* ── Title ── */}
      <div className="px-6 pt-5 pb-2">
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          className="w-full bg-transparent outline-none text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        />

        {/* Tags row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)] border"
              style={{
                backgroundColor: "var(--color-accent-subtle)",
                color: "var(--color-accent-primary)",
                borderColor: "var(--color-accent-primary)",
              }}
            >
              #{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {showTagInput ? (
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              onKeyDown={handleTagInputKey}
              onBlur={() => {
                if (tagInput.trim()) handleAddTag();
                else setShowTagInput(false);
              }}
              placeholder="Add tag..."
              className="w-24 px-2 py-0.5 text-xs rounded-[var(--radius-sm)] border outline-none"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border-primary)",
                color: "var(--color-text-primary)",
              }}
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="flex items-center gap-0.5 px-2 py-0.5 text-xs rounded-[var(--radius-sm)] border transition-colors hover:bg-[var(--color-bg-hover)]"
              style={{
                borderColor: "var(--color-border-secondary)",
                color: "var(--color-text-tertiary)",
              }}
            >
              <Plus className="w-3 h-3" /> Add tag
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <NoteToolbar
        mode={mode}
        onChangeMode={handleChangeMode}
        saving={saving}
        lastSaved={lastSaved}
      />

      {/* ── Search bar ── */}
      {searchOpen && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b-2"
          style={{
            backgroundColor: "var(--color-bg-primary)",
            borderColor: "var(--color-border-primary)",
          }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: "var(--color-text-tertiary)" }} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentMatch(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                navigateMatch(e.shiftKey ? "prev" : "next");
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setSearchOpen(false);
                setSearchQuery("");
              }
            }}
            placeholder="Search in note..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--color-text-primary)" }}
            autoFocus
          />
          {searchQuery && (
            <>
              <span
                className="text-xs font-mono min-w-[3rem] text-right"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {totalMatches > 0
                  ? `${currentMatch + 1}/${totalMatches}`
                  : "0/0"}
              </span>
              <button
                onClick={() => navigateMatch("prev")}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
              </button>
              <button
                onClick={() => navigateMatch("next")}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors"
                title="Next match (Enter)"
              >
                <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--color-bg-hover)] transition-colors"
            title="Close search (Escape)"
          >
            <X className="w-3.5 h-3.5" style={{ color: "var(--color-text-secondary)" }} />
          </button>
        </div>
      )}

      {/* ── Editor / Preview area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Edit pane */}
        {(mode === "edit" || mode === "split") && (
          <div
            className={`relative ${
              mode === "split" ? "w-1/2" : "flex-1"
            } overflow-hidden`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              className="w-full h-full resize-none outline-none p-6 leading-relaxed scrollbar-thin"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: "14px",
                lineHeight: "1.7",
                tabSize: 2,
              }}
              placeholder="Start writing in Markdown...

Use [[Note Title]] to link to other notes.
Use #tags to categorize your notes."
              spellCheck={false}
            />

            {/* Wikilink autocomplete */}
            <WikilinkAutocomplete
              open={wikilinkOpen}
              search={wikilinkSearch}
              position={wikilinkPosition}
              onSelect={handleWikilinkSelect}
              onClose={() => setWikilinkOpen(false)}
            />
          </div>
        )}

        {/* Divider for split mode */}
        {mode === "split" && (
          <div
            className="w-px flex-shrink-0"
            style={{ backgroundColor: "var(--color-border-primary)" }}
          />
        )}

        {/* Preview pane */}
        {(mode === "preview" || mode === "split") && (
          <div
            className={`${
              mode === "split" ? "w-1/2" : "flex-1"
            } overflow-y-auto scrollbar-thin`}
          >
            {content.trim() ? (
              <div
                className="prose prose-sm max-w-none py-4 px-6 prose-headings:font-semibold prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent prose-a:text-[var(--color-accent-primary)] prose-a:no-underline hover:prose-a:underline prose-code:text-sm prose-code:bg-[var(--color-bg-tertiary)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-[var(--radius-sm)] prose-code:before:content-none prose-code:after:content-none"
                style={{ color: "var(--color-text-primary)" }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    ...(() => {
                      const makeHeading = (level: number) =>
                        ({ children, ...props }: any) => {
                          const text = String(children);
                          const id = text
                            .toLowerCase()
                            .replace(/<[^>]+>/g, "")
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "");
                          const Tag = `h${level}` as any;
                          return <Tag id={id} {...props}>{children}</Tag>;
                        };
                      return {
                        h1: makeHeading(1),
                        h2: makeHeading(2),
                        h3: makeHeading(3),
                        h4: makeHeading(4),
                        h5: makeHeading(5),
                        h6: makeHeading(6),
                      };
                    })(),
                    a: ({ href, children, ...props }) => {
                      if (href?.startsWith("/notes/")) {
                        return (
                          <a
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(href);
                            }}
                            style={{ color: "var(--color-accent-primary)", cursor: "pointer" }}
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      }
                      if (href?.startsWith("#")) {
                        return (
                          <a
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              const id = href.slice(1);
                              const el = document.getElementById(id);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            style={{ color: "var(--color-accent-primary)", cursor: "pointer" }}
                            {...props}
                          >
                            {children}
                          </a>
                        );
                      }
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                    code: ({ className, children, ...props }: any) => {
                      const codeString = String(children).replace(/\n$/, "");

                      // ── Mermaid diagram support ──
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "";

                      if (language === "mermaid") {
                        return <MermaidDiagram code={codeString} />;
                      }

                      const isInline = !className && !codeString.includes("\n");

                      if (isInline) {
                        return (
                          <code
                            className="px-1 py-0.5 rounded text-sm"
                            style={{
                              backgroundColor: "var(--color-bg-tertiary)",
                              color: "var(--color-accent-primary)",
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      // Try to highlight
                      let highlighted: string | null = null;
                      try {
                        if (language && hljs.getLanguage(language)) {
                          highlighted = hljs.highlight(codeString, { language }).value;
                        }
                      } catch {}

                      return (
                        <pre
                          className="not-prose overflow-x-auto my-0 py-2 rounded-lg"
                          style={{
                            backgroundColor: "#f0f0f0",
                          }}
                        >
                          {highlighted ? (
                            <code
                              className={className || undefined}
                              style={{
                                color: "var(--color-text-primary)",
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontSize: "13px",
                                lineHeight: "1.6",
                              }}
                              dangerouslySetInnerHTML={{ __html: highlighted }}
                            />
                          ) : (
                            <code
                              className={className || undefined}
                              style={{
                                color: "var(--color-text-primary)",
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontSize: "13px",
                                lineHeight: "1.6",
                              }}
                              {...props}
                            >
                              {children}
                            </code>
                          )}
                        </pre>
                      );
                    },
                  }}
                >
{preprocessedContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div
                className="flex items-center justify-center h-full text-sm"
style={{ color: "var(--color-text-secondary)" }}
              >
                Nothing to preview — start writing in Edit mode
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar: Backlinks + Status ── */}
      <div
        className="border-t-2 px-4 py-2 space-y-2"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          borderColor: "var(--color-border-primary)",
        }}
      >
        {/* Backlinks */}
        {st.activeNote && st.activeNote.backlinks && st.activeNote.backlinks.length > 0 && (
          <BacklinksPanel backlinks={st.activeNote.backlinks} />
        )}

        {/* Status bar */}
        <div
          className="flex items-center justify-between text-[11px] font-mono"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            {saving && (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {!saving && lastSaved && <span>Saved</span>}
          </div>
          <div className="flex items-center gap-3">
            {createdDate && <span>Created {createdDate}</span>}
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-error)]"
              title="Delete note"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleTogglePin}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors hover:bg-[var(--color-bg-hover)]"
              title={activeNote.pinned === 1 ? "Unpin" : "Pin"}
            >
              {activeNote.pinned === 1 ? (
                <PinOff className="w-3 h-3" />
              ) : (
                <Pin className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      
    </div>
  );
}

// ── Mermaid Diagram Component ──

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`);
  const renderedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    renderedRef.current = false;
    setLoading(true);
    setError(null);

    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render(idRef.current, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          renderedRef.current = true;
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("Mermaid render error:", err);
          setError(err?.message || err?.toString() || "Render failed");
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre
        className="not-prose overflow-x-auto my-0 py-2 rounded-lg"
        style={{
          backgroundColor: "#f0f0f0",
          color: "var(--color-error)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "13px",
        }}
      >
        <code>Mermaid error: {error}</code>
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="not-prose my-4 flex justify-center overflow-x-auto"
      style={{ minHeight: loading ? "60px" : undefined }}
    />
  );
}

