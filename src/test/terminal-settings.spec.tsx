import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock data dependencies ──
vi.mock("../data/terminalThemes", () => ({
  TERMINAL_THEMES: [
    {
      name: "Catppuccin Mocha",
      category: "dark",
      background: "#1E1E2E",
      foreground: "#CDD6F4",
      cursor: "#F5E0DC",
      selectionBackground: "#585B70",
      black: "#45475A", red: "#F38BA8", green: "#A6E3A1", yellow: "#F9E2AF",
      blue: "#89B4FA", magenta: "#F5C2E7", cyan: "#94E2D5", white: "#BAC2DE",
      brightBlack: "#585B70", brightRed: "#F38BA8", brightGreen: "#A6E3A1",
      brightYellow: "#F9E2AF", brightBlue: "#89B4FA", brightMagenta: "#F5C2E7",
      brightCyan: "#94E2D5", brightWhite: "#A6ADC8",
    },
    {
      name: "Solarized Dark",
      category: "dark",
      background: "#002B36",
      foreground: "#839496",
      cursor: "#839496",
      selectionBackground: "#073642",
      black: "#073642", red: "#DC322F", green: "#859900", yellow: "#B58900",
      blue: "#268BD2", magenta: "#D33682", cyan: "#2AA198", white: "#EEE8D5",
      brightBlack: "#002B36", brightRed: "#DC322F", brightGreen: "#859900",
      brightYellow: "#B58900", brightBlue: "#268BD2", brightMagenta: "#D33682",
      brightCyan: "#2AA198", brightWhite: "#FDF6E3",
    },
    {
      name: "Catppuccin Latte",
      category: "light",
      background: "#FEFEFA",
      foreground: "#1E1E2E",
      cursor: "#1E1E2E",
      selectionBackground: "#D0D0D0",
      black: "#6C7086", red: "#D20F39", green: "#40A02B", yellow: "#DF8E1D",
      blue: "#1E66F5", magenta: "#EA76CB", cyan: "#179299", white: "#4C4F69",
      brightBlack: "#9CA0B0", brightRed: "#D20F39", brightGreen: "#40A02B",
      brightYellow: "#DF8E1D", brightBlue: "#1E66F5", brightMagenta: "#EA76CB",
      brightCyan: "#179299", brightWhite: "#4C4F69",
    },
  ],
  DEFAULT_THEME: "Catppuccin Mocha",
  getTheme: vi.fn((name: string) => {
    const themes: Record<string, any> = {
      "Catppuccin Mocha": {
        name: "Catppuccin Mocha",
        category: "dark",
        background: "#1E1E2E",
        foreground: "#CDD6F4",
        cursor: "#F5E0DC",
        selectionBackground: "#585B70",
        black: "#45475A", red: "#F38BA8", green: "#A6E3A1", yellow: "#F9E2AF",
        blue: "#89B4FA", magenta: "#F5C2E7", cyan: "#94E2D5", white: "#BAC2DE",
        brightBlack: "#585B70", brightRed: "#F38BA8", brightGreen: "#A6E3A1",
        brightYellow: "#F9E2AF", brightBlue: "#89B4FA", brightMagenta: "#F5C2E7",
        brightCyan: "#94E2D5", brightWhite: "#A6ADC8",
      },
      "Solarized Dark": {
        name: "Solarized Dark",
        category: "dark",
        background: "#002B36",
        foreground: "#839496",
        cursor: "#839496",
        selectionBackground: "#073642",
        black: "#073642", red: "#DC322F", green: "#859900", yellow: "#B58900",
        blue: "#268BD2", magenta: "#D33682", cyan: "#2AA198", white: "#EEE8D5",
        brightBlack: "#002B36", brightRed: "#DC322F", brightGreen: "#859900",
        brightYellow: "#B58900", brightBlue: "#268BD2", brightMagenta: "#D33682",
        brightCyan: "#2AA198", brightWhite: "#FDF6E3",
      },
      "Catppuccin Latte": {
        name: "Catppuccin Latte",
        category: "light",
        background: "#FEFEFA",
        foreground: "#1E1E2E",
        cursor: "#1E1E2E",
        selectionBackground: "#D0D0D0",
        black: "#6C7086", red: "#D20F39", green: "#40A02B", yellow: "#DF8E1D",
        blue: "#1E66F5", magenta: "#EA76CB", cyan: "#179299", white: "#4C4F69",
        brightBlack: "#9CA0B0", brightRed: "#D20F39", brightGreen: "#40A02B",
        brightYellow: "#DF8E1D", brightBlue: "#1E66F5", brightMagenta: "#EA76CB",
        brightCyan: "#179299", brightWhite: "#4C4F69",
      },
    };
    return themes[name];
  }),
  getThemesByCategory: vi.fn(() => ({
    dark: [
      {
        name: "Catppuccin Mocha",
        category: "dark",
        background: "#1E1E2E",
        foreground: "#CDD6F4",
        cursor: "#F5E0DC",
        selectionBackground: "#585B70",
        black: "#45475A", red: "#F38BA8", green: "#A6E3A1", yellow: "#F9E2AF",
        blue: "#89B4FA", magenta: "#F5C2E7", cyan: "#94E2D5", white: "#BAC2DE",
        brightBlack: "#585B70", brightRed: "#F38BA8", brightGreen: "#A6E3A1",
        brightYellow: "#F9E2AF", brightBlue: "#89B4FA", brightMagenta: "#F5C2E7",
        brightCyan: "#94E2D5", brightWhite: "#A6ADC8",
      },
      {
        name: "Solarized Dark",
        category: "dark",
        background: "#002B36",
        foreground: "#839496",
        cursor: "#839496",
        selectionBackground: "#073642",
        black: "#073642", red: "#DC322F", green: "#859900", yellow: "#B58900",
        blue: "#268BD2", magenta: "#D33682", cyan: "#2AA198", white: "#EEE8D5",
        brightBlack: "#002B36", brightRed: "#DC322F", brightGreen: "#859900",
        brightYellow: "#B58900", brightBlue: "#268BD2", brightMagenta: "#D33682",
        brightCyan: "#2AA198", brightWhite: "#FDF6E3",
      },
    ],
    light: [
      {
        name: "Catppuccin Latte",
        category: "light",
        background: "#FEFEFA",
        foreground: "#1E1E2E",
        cursor: "#1E1E2E",
        selectionBackground: "#D0D0D0",
        black: "#6C7086", red: "#D20F39", green: "#40A02B", yellow: "#DF8E1D",
        blue: "#1E66F5", magenta: "#EA76CB", cyan: "#179299", white: "#4C4F69",
        brightBlack: "#9CA0B0", brightRed: "#D20F39", brightGreen: "#40A02B",
        brightYellow: "#DF8E1D", brightBlue: "#1E66F5", brightMagenta: "#EA76CB",
        brightCyan: "#179299", brightWhite: "#4C4F69",
      },
    ],
  })),
}));

// ── Mock store ──
let mockThemeName = "Catppuccin Mocha";

vi.mock("../stores/terminalStore", () => ({
  terminalStore: {
    subscribe: vi.fn(() => vi.fn()),
    setTheme: vi.fn((name: string) => {
      mockThemeName = name;
    }),
    get state() {
      return {
        isOpen: false,
        isRunning: false,
        pid: null,
        isLoading: false,
        error: null,
        exitCode: null,
        themeName: mockThemeName,
      };
    },
  },
}));

import { terminalStore as mockStore } from "../stores/terminalStore";
import { TerminalSettings } from "../pages/settings/TerminalSettings";

describe("TerminalSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeName = "Catppuccin Mocha";
  });

  it("should render the settings page with title", () => {
    render(<TerminalSettings />);
    expect(screen.getByText("Terminal Settings")).toBeTruthy();
  });

  it("should show the active theme name", () => {
    render(<TerminalSettings />);
    // The active theme appears in the Current Theme section and as a theme card
    const elements = screen.getAllByText("Catppuccin Mocha");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("should render dark themes section", () => {
    render(<TerminalSettings />);
    expect(screen.getByText("Dark Themes")).toBeTruthy();
  });

  it("should render light themes section", () => {
    render(<TerminalSettings />);
    expect(screen.getByText("Light Themes")).toBeTruthy();
  });

  it("should call setTheme when clicking a theme card", () => {
    render(<TerminalSettings />);

    // Find a theme card button (by theme name)
    const card = screen.getByText("Solarized Dark").closest("button");
    if (card) fireEvent.click(card);

    expect(mockStore.setTheme).toHaveBeenCalledWith("Solarized Dark");
  });

  it("should show the ANSI color palette", () => {
    render(<TerminalSettings />);
    expect(screen.getByText("ANSI Color Palette")).toBeTruthy();
  });

  it("should display theme category badge", () => {
    render(<TerminalSettings />);
    // The current theme "Catppuccin Mocha" is "dark", displayed in the Current Theme section
    expect(screen.getByText("dark")).toBeTruthy();
  });
});
