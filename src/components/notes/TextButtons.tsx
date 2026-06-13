import { Button } from "../ui/button";
import { cn } from "../../utils/cn";
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  const items = [
    {
      name: "bold",
      isActive: (editor: any) => editor.isActive("bold"),
      command: (editor: any) => editor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: (editor: any) => editor.isActive("italic"),
      command: (editor: any) => editor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: (editor: any) => editor.isActive("underline"),
      command: (editor: any) => editor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      isActive: (editor: any) => editor.isActive("strike"),
      command: (editor: any) => editor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
  ];

  return (
    <div className="flex">
      {items.map((item) => (
        <EditorBubbleItem
          key={item.name}
          onSelect={(editor) => {
            item.command(editor);
          }}
        >
          <Button
            size="sm"
            className="rounded-none"
            variant="ghost"
            type="button"
            style={{
              color: item.isActive(editor)
                ? "var(--color-accent-primary)"
                : "var(--color-text-primary)",
            }}
          >
            <item.icon
              className={cn("h-4 w-4", {
                "text-[var(--color-accent-primary)]": item.isActive(editor),
                "text-[var(--color-text-primary)]": !item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
