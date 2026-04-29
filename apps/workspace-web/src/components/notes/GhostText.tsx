import { useEffect, useRef } from "react";

interface GhostTextProps {
  text: string;
  editor: any;
}

export function GhostText({ text, editor }: GhostTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor || !text || !ref.current) return;

    const updatePosition = () => {
      const { from } = editor.state.selection;
      const coords = editor.view.coordsAtPos(from);
      const el = ref.current;
      if (!el) return;

      el.style.left = `${coords.left}px`;
      el.style.top = `${coords.top}px`;
      el.style.display = "block";
    };

    updatePosition();
    const handleScroll = () => updatePosition();
    const handleSelection = () => updatePosition();

    editor.view.dom.addEventListener("scroll", handleScroll);
    editor.on("selectionUpdate", handleSelection);

    return () => {
      editor.view.dom.removeEventListener("scroll", handleScroll);
      editor.off("selectionUpdate", handleSelection);
    };
  }, [editor, text]);

  if (!text) return null;

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-40 whitespace-pre"
      style={{
        color: "var(--color-text-tertiary)",
        fontStyle: "italic",
        opacity: 0.6,
        fontSize: "inherit",
        lineHeight: "inherit",
        fontFamily: "inherit",
      }}
    >
      {text}
    </div>
  );
}
