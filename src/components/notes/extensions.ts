import {
  AIHighlight,
  CharacterCount,
  CodeBlockLowlight,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
} from "novel";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return "Heading";
    }
    if (node.type.name === "paragraph") {
      return "Type '/' for commands...";
    }
    return "";
  },
});

const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: "underline underline-offset-[3px] cursor-pointer transition-colors",
  },
});

const tiptapImage = TiptapImage.configure({
  allowBase64: true,
  HTMLAttributes: {
    class: "rounded-[var(--radius-md)] border",
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: "not-prose pl-2",
  },
});

const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: "flex gap-2 items-start my-4",
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: "mt-4 mb-6 border-t",
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: "list-disc list-outside leading-3 -mt-2",
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: "list-decimal list-outside leading-3 -mt-2",
    },
  },
  listItem: {
    HTMLAttributes: {
      class: "leading-normal -mb-2",
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: "border-l-4 border-[var(--color-border-primary)]",
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: "rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] border p-5 font-mono font-medium",
    },
  },
  code: {
    HTMLAttributes: {
      class: "rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] px-1.5 py-1 font-mono font-medium",
      spellcheck: "false",
    },
  },
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  lowlight,
});

const characterCount = CharacterCount.configure();

export const defaultExtensions = [
  starterKit,
  placeholder,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  horizontalRule,
  codeBlockLowlight,
  characterCount,
  TiptapUnderline,
  HighlightExtension,
  AIHighlight,
  GlobalDragHandle,
];
