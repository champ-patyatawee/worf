export interface TerminalTheme {
  name: string;
  category: "dark" | "light";
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TabSwitchShortcut {
  id: string;
  label: string;
  nextModifier: 'ctrlKey' | 'metaKey' | 'altKey';
  nextKey: string;
  nextShift: boolean;
  prevModifier: 'ctrlKey' | 'metaKey' | 'altKey';
  prevKey: string;
  prevShift: boolean;
}
