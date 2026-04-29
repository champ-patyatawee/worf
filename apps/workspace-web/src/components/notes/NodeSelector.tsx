import {
  Check,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ListOrdered,
  TextIcon,
  TextQuote,
  CheckSquare,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const items = [
  {
    name: "Text",
    icon: TextIcon,
    command: (editor: any) => editor.chain().focus().clearNodes().run(),
    isActive: (editor: any) =>
      editor.isActive("paragraph") && !editor.isActive("bulletList") && !editor.isActive("orderedList"),
  },
  {
    name: "Heading 1",
    icon: Heading1,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run(),
    isActive: (editor: any) => editor.isActive("heading", { level: 1 }),
  },
  {
    name: "Heading 2",
    icon: Heading2,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run(),
    isActive: (editor: any) => editor.isActive("heading", { level: 2 }),
  },
  {
    name: "Heading 3",
    icon: Heading3,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run(),
    isActive: (editor: any) => editor.isActive("heading", { level: 3 }),
  },
  {
    name: "To-do List",
    icon: CheckSquare,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleTaskList().run(),
    isActive: (editor: any) => editor.isActive("taskItem"),
  },
  {
    name: "Bullet List",
    icon: ListOrdered,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleBulletList().run(),
    isActive: (editor: any) => editor.isActive("bulletList"),
  },
  {
    name: "Numbered List",
    icon: ListOrdered,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleOrderedList().run(),
    isActive: (editor: any) => editor.isActive("orderedList"),
  },
  {
    name: "Quote",
    icon: TextQuote,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleBlockquote().run(),
    isActive: (editor: any) => editor.isActive("blockquote"),
  },
  {
    name: "Code",
    icon: Code,
    command: (editor: any) => editor.chain().focus().clearNodes().toggleCodeBlock().run(),
    isActive: (editor: any) => editor.isActive("codeBlock"),
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeSelector = ({ open, onOpenChange }: NodeSelectorProps) => {
  const { editor } = useEditor();
  if (!editor) return null;

  const activeItem = items.filter((item) => item.isActive(editor)).pop() ?? {
    name: "Multiple",
  };

  return (
    <Popover modal={true} open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-2 rounded-none" style={{ color: 'var(--color-text-primary)' }}>
          <span className="whitespace-nowrap text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{activeItem.name}</span>
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--color-text-primary)' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent sideOffset={5} align="start" className="w-48 p-1">
        {items.map((item) => (
          <EditorBubbleItem
            key={item.name}
            onSelect={(editor) => {
              item.command(editor);
              onOpenChange(false);
            }}
            className="flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-sm hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <div className="rounded-[var(--radius-md)] border-2 p-1" style={{ borderColor: 'var(--color-border-primary)' }}>
                <item.icon className="h-3 w-3" style={{ color: 'var(--color-text-primary)' }} />
              </div>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.name}</span>
            </div>
            {activeItem.name === item.name && <Check className="h-4 w-4" style={{ color: 'var(--color-accent-primary)' }} />}
          </EditorBubbleItem>
        ))}
      </PopoverContent>
    </Popover>
  );
};
