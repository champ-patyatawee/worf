export interface NavigationShortcut {
  id: "dashboard" | "notes" | "projects" | "ai-chat" | "terminal" | "settings";
  label: string;
  path: string | null;           // null for terminal (special toggle action)
  key: string | null;            // null = disabled. e.g. "1", "d", "F5"
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}
