import type { TabSwitchShortcut } from "../types/terminal";

export const TAB_SWITCH_SHORTCUTS: TabSwitchShortcut[] = [
  {
    id: "ctrl-tab",
    label: "Ctrl+Tab / Ctrl+Shift+Tab",
    nextModifier: "ctrlKey", nextKey: "Tab", nextShift: false,
    prevModifier: "ctrlKey", prevKey: "Tab", prevShift: true,
  },
  {
    id: "ctrl-brackets",
    label: "Ctrl+] / Ctrl+[",
    nextModifier: "ctrlKey", nextKey: "]", nextShift: false,
    prevModifier: "ctrlKey", prevKey: "[", prevShift: false,
  },
  {
    id: "ctrl-pgup-pgdn",
    label: "Ctrl+PageDown / Ctrl+PageUp",
    nextModifier: "ctrlKey", nextKey: "PageDown", nextShift: false,
    prevModifier: "ctrlKey", prevKey: "PageUp", prevShift: false,
  },
  {
    id: "cmd-brackets",
    label: "Cmd+] / Cmd+[",
    nextModifier: "metaKey", nextKey: "]", nextShift: false,
    prevModifier: "metaKey", prevKey: "[", prevShift: false,
  },
  {
    id: "alt-brackets",
    label: "Alt+] / Alt+[",
    nextModifier: "altKey", nextKey: "]", nextShift: false,
    prevModifier: "altKey", prevKey: "[", prevShift: false,
  },
  {
    id: "alt-tab",
    label: "Alt+Tab / Alt+Shift+Tab",
    nextModifier: "altKey", nextKey: "Tab", nextShift: false,
    prevModifier: "altKey", prevKey: "Tab", prevShift: true,
  },
];

export const DEFAULT_SHORTCUT_ID = "ctrl-tab";

export function getTabSwitchShortcut(id: string): TabSwitchShortcut {
  return TAB_SWITCH_SHORTCUTS.find((s) => s.id === id) ?? TAB_SWITCH_SHORTCUTS[0];
}
