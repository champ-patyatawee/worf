import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "novel";
import { useDebouncedCallback } from "use-debounce";
import { aiComplete } from "../../services/aiService";

export function useAICompletion() {
  const { editor } = useEditor();
  const [ghostText, setGhostText] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCompletion = useDebouncedCallback(async () => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const doc = editor.state.doc;

    const textBefore = doc.textBetween(0, from, "\n");
    const textAfter = doc.textBetween(from, doc.content.size, "\n");

    if (!textBefore.trim() && !textAfter.trim()) return;

    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const completion = await aiComplete(textBefore, textAfter);
      if (completion && completion.trim()) {
        setGhostText(completion);
      } else {
        setGhostText("");
      }
    } catch (err) {
      setGhostText("");
    } finally {
      setLoading(false);
    }
  }, 300);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setGhostText("");
      fetchCompletion();
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", () => {
      setGhostText("");
    });

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, fetchCompletion]);

  const acceptCompletion = useCallback(() => {
    if (!editor || !ghostText) return;
    editor.chain().focus().insertContent(ghostText).run();
    setGhostText("");
  }, [editor, ghostText]);

  const dismissCompletion = useCallback(() => {
    setGhostText("");
  }, []);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (ghostText) {
        if (e.key === "Tab") {
          e.preventDefault();
          acceptCompletion();
        } else if (e.key === "Escape") {
          e.preventDefault();
          dismissCompletion();
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("keydown", handleKeyDown);
    return () => editorElement.removeEventListener("keydown", handleKeyDown);
  }, [editor, ghostText, acceptCompletion, dismissCompletion]);

  return { ghostText, loading, acceptCompletion, dismissCompletion };
}
