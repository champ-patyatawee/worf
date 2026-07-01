import { useCallback } from "react";
import {
  Image,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  List,
  CheckSquare,
  Link,
} from "lucide-react";
import type { EditorMode } from "./Types";

// ── Types ──

interface EditBarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onContentChange: (newContent: string) => void;
  onInsertImage: () => void;
}

// ── Button group definitions ──

interface ButtonDef {
  icon: typeof Bold;
  label: string;
  title: string;
  action: () => void;
}

// ── Component ──

export function EditBar({
  textareaRef,
  content,
  onContentChange,
  onInsertImage,
}: EditBarProps) {
  // ── Core formatting helpers ──

  const insertFormat = useCallback(
    (prefix: string, suffix: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const newText = prefix + selectedText + suffix;
      const newContent =
        content.substring(0, start) + newText + content.substring(end);

      onContentChange(newContent);

      // Restore cursor / selection after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        if (selectedText) {
          textarea.setSelectionRange(
            start + prefix.length,
            start + prefix.length + selectedText.length,
          );
        } else {
          textarea.setSelectionRange(
            start + prefix.length,
            start + prefix.length,
          );
        }
      });
    },
    [content, textareaRef, onContentChange],
  );

  const insertHeading = useCallback(
    (level: number) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf("\n") + 1;

      const rest = content.substring(lineStart);
      const lineEnd = rest.indexOf("\n");
      const currentLine =
        lineEnd !== -1 ? rest.substring(0, lineEnd) : rest;

      // Remove any existing heading prefix
      const cleanLine = currentLine.replace(/^#+\s*/, "");
      const prefix = "#".repeat(level) + " ";
      const newContent =
        content.substring(0, lineStart) +
        prefix +
        cleanLine +
        content.substring(lineStart + currentLine.length);

      onContentChange(newContent);

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = lineStart + prefix.length + cleanLine.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [content, textareaRef, onContentChange],
  );

  const insertList = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const beforeCursor = content.substring(0, start);
      const lineStart = beforeCursor.lastIndexOf("\n") + 1;

      const newContent =
        content.substring(0, lineStart) +
        prefix +
        content.substring(lineStart);

      onContentChange(newContent);

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + prefix.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [content, textareaRef, onContentChange],
  );

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (selectedText) {
      // Wrap selection: [selected](url)
      const url = window.prompt("Enter URL:", "https://");
      if (url === null) return; // cancelled
      const newText = `[${selectedText}](${url || ""})`;
      const newContent =
        content.substring(0, start) + newText + content.substring(end);

      onContentChange(newContent);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + newText.length,
          start + newText.length,
        );
      });
    } else {
      // No selection: insert [](url) and place cursor between brackets
      const url = window.prompt("Enter URL:", "https://");
      if (url === null) return;
      const newText = `[](${url || ""})`;
      const newContent =
        content.substring(0, start) + newText + content.substring(end);

      onContentChange(newContent);

      requestAnimationFrame(() => {
        textarea.focus();
        // Place cursor between [ and ]
        textarea.setSelectionRange(start + 1, start + 1);
      });
    }
  }, [content, textareaRef, onContentChange]);

  // ── Build button groups ──

  const buttonGroups: ButtonDef[][] = [
    // Group 1 — Insert
    [
      {
        icon: Image,
        label: "",
        title: "Insert Image (opens file dialog)",
        action: onInsertImage,
      },
    ],
    // Group 2 — Headings
    [
      {
        icon: Heading1,
        label: "",
        title: "Heading 1",
        action: () => insertHeading(1),
      },
      {
        icon: Heading2,
        label: "",
        title: "Heading 2",
        action: () => insertHeading(2),
      },
      {
        icon: Heading3,
        label: "",
        title: "Heading 3",
        action: () => insertHeading(3),
      },
    ],
    // Group 3 — Format
    [
      {
        icon: Bold,
        label: "",
        title: "Bold (**)",
        action: () => insertFormat("**", "**"),
      },
      {
        icon: Italic,
        label: "",
        title: "Italic (*)",
        action: () => insertFormat("*", "*"),
      },
      {
        icon: Strikethrough,
        label: "",
        title: "Strikethrough (~~)",
        action: () => insertFormat("~~", "~~"),
      },
    ],
    // Group 4 — Lists
    [
      {
        icon: List,
        label: "",
        title: "Bullet list",
        action: () => insertList("- "),
      },
      {
        icon: CheckSquare,
        label: "",
        title: "Task list",
        action: () => insertList("- [ ] "),
      },
    ],
    // Group 5 — Link
    [
      {
        icon: Link,
        label: "",
        title: "Insert link",
        action: insertLink,
      },
    ],
  ];

  return (
    <div
      className="flex items-center gap-1 px-4 py-1.5 border-b-2 overflow-x-auto scrollbar-hide"
      style={{
        backgroundColor: "var(--color-bg-primary)",
        borderColor: "var(--color-border-primary)",
      }}
    >
      {buttonGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && (
            <div
              className="w-px h-5 mx-1 flex-shrink-0"
              style={{ backgroundColor: "var(--color-border-secondary)" }}
            />
          )}
          {group.map((btn) => (
            <button
              key={btn.title}
              onClick={btn.action}
              title={btn.title}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-150"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-tertiary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-bg-hover)";
                e.currentTarget.style.color = "var(--color-accent-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-tertiary)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-accent-subtle)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-bg-hover)";
              }}
            >
              <btn.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
