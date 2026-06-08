import { describe, it, expect } from "vitest";
import {
  TERMINAL_THEMES,
  getTheme,
  getThemesByCategory,
  DEFAULT_THEME,
} from "../data/terminalThemes";

describe("terminal themes data", () => {
  it("should have at least 8 themes", () => {
    expect(TERMINAL_THEMES.length).toBeGreaterThanOrEqual(8);
  });

  it("each theme should have all required fields", () => {
    const requiredFields = [
      "name", "category", "background", "foreground", "cursor",
      "selectionBackground", "black", "red", "green", "yellow",
      "blue", "magenta", "cyan", "white",
      "brightBlack", "brightRed", "brightGreen", "brightYellow",
      "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
    ];
    for (const theme of TERMINAL_THEMES) {
      for (const field of requiredFields) {
        expect(theme).toHaveProperty(field);
        expect(typeof (theme as any)[field]).toBe(
          field === "name" || field === "category" ? "string" : "string",
        );
      }
    }
  });

  it("should have unique theme names", () => {
    const names = TERMINAL_THEMES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("getTheme should return correct theme by name", () => {
    const theme = getTheme("Dracula");
    expect(theme.name).toBe("Dracula");
    expect(theme.category).toBe("dark");
  });

  it("getTheme should return default for unknown name", () => {
    const theme = getTheme("NonExistentTheme");
    expect(theme.name).toBe(DEFAULT_THEME);
  });

  it("getThemesByCategory should group themes correctly", () => {
    const { dark, light } = getThemesByCategory();
    // All dark themes should have category "dark"
    dark.forEach((t) => expect(t.category).toBe("dark"));
    // All light themes should have category "light"
    light.forEach((t) => expect(t.category).toBe("light"));
    // Combined should equal all themes
    expect(dark.length + light.length).toBe(TERMINAL_THEMES.length);
  });

  it("should have at least one dark theme", () => {
    const dark = TERMINAL_THEMES.filter((t) => t.category === "dark");
    expect(dark.length).toBeGreaterThan(0);
  });

  it("DEFAULT_THEME should be a valid theme name", () => {
    const names = TERMINAL_THEMES.map((t) => t.name);
    expect(names).toContain(DEFAULT_THEME);
  });

  it("background colors should be valid hex", () => {
    for (const theme of TERMINAL_THEMES) {
      expect(theme.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
