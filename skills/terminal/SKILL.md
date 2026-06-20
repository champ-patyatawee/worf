---
name: terminal
description: PTY-based terminal emulator with xterm.js, multi-tab support, themes, and settings
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Terminal** feature — a full PTY-based terminal emulator with multi-tab support
- Create or modify the terminal panel in `src/components/terminal/`
- Manage the PTY lifecycle: spawn processes, relay I/O, handle resize/SIGWINCH
- Configure themes, keyboard shortcuts, dock position, and font settings
- Handle buffer replay for seamless tab switching

## When to use me
Use when working on the Terminal module — adding terminal features, modifying PTY behavior, changing themes/settings, working on xterm.js integration, fixing I/O event relay, or debugging tab management. Invoke this skill whenever files under `src/components/terminal/`, `src/stores/terminalStore.ts`, `src/data/terminalThemes.ts`, `src/data/terminalShortcuts.ts`, or the `terminal` Rust commands are involved.

## Architecture

### Frontend

```
src/components/terminal/
└── TerminalPanel.tsx       # Full terminal UI — xterm.js, multi-tab, search, resize, keyboard shortcuts

src/stores/
└── terminalStore.ts        # Terminal state: tabs, settings, I/O event relay (pub/sub pattern)

src/data/
├── terminalThemes.ts       # 8 built-in themes (Catppuccin, Solarized, Dracula, Nord, Gruvbox, Tokyo Night)
└── terminalShortcuts.ts    # 6 tab switch shortcut configurations

src/pages/settings/
└── TerminalSettings.tsx    # Settings page: theme, font size, dock position, mode, shortcuts

src/types/
└── terminal.ts             # TerminalTheme, TabSwitchShortcut types
```

### Key Files & Roles

#### `TerminalPanel.tsx`
The main terminal panel component. Renders:
- **Tab bar** — each tab as a clickable item with close button
- **xterm.js instance** — created per tab, disposed on close
- **Search overlay** — Ctrl+F opens search in the xterm addon
- **Drag resize handle** — adjustable terminal height
- **Zoom controls** — Ctrl+= / Ctrl+- to change font size
- **Dock position toggle** — bottom vs. top
- **Mode toggle** — overlay (floating) vs. fullscreen

Keyboard shortcuts (handled via `useEffect`):
| Shortcut | Action |
|---|---|
| Cmd+T | New tab |
| Cmd+W | Close active tab |
| Cmd+Shift+N | Go to tab N (N = 1-9) |
| Cmd+F | Open search |
| Cmd+= | Zoom in |
| Cmd+- | Zoom out |
| Tab switch config | Per user-configured shortcut |

Architecture details:
- Each tab creates its own `Terminal` instance from `@xterm/xterm`
- Uses `@xterm/addon-fit` for auto-sizing
- Uses `@xterm/addon-search` for Ctrl+F
- Uses `@xterm/addon-web-links` for clickable URLs
- Uses `@xterm/addon-unicode11` for wide character support
- Output events listened via Tauri `listen("terminal-output")` and `listen("terminal-exited")`
- Buffer replay: on tab switch, any buffered output not yet written to xterm is replayed
- ResizeObserver monitors container size changes

#### `terminalStore.ts`
Custom pub/sub store managing:
- **Tabs**: array of `TerminalTab` with `id`, `pid`, `title`, `buffer[]`, `writtenIndex`, `isRunning`, `exitCode`
- **Active tab**: tracks which tab is currently visible
- **Settings** (all persisted to `localStorage`):
  - `terminal-theme-name` — string theme name
  - `terminal-height` — numeric panel height (100px to 95vh)
  - `terminal-font-size` — numeric font size (9 to 32, default 13)
  - `terminal-dock-position` — "bottom" or "top"
  - `terminal-mode` — "overlay" or "fullscreen"
  - `terminal-tab-switch-shortcut` — shortcut ID string

Key methods:
| Method | Description |
|---|---|
| `toggle()` | Opens/closes panel; auto-creates first tab |
| `closeAllConfirmed()` | Closes all tabs with native confirmation dialog |
| `createTab()` | Calls Rust `create_terminal_tab`, adds to tab list |
| `switchTab(id)` | Switches active tab (triggers buffer replay) |
| `closeTab(id)` | Calls Rust `close_terminal_tab`, removes from list |
| `write(data)` | Sends keystrokes to active tab's PTY |
| `resize(rows, cols)` | Calls Rust `resize_terminal` |
| `handleOutput(tabId, data)` | Appends to tab buffer; emits for inactive tabs |
| `handleExited(tabId, code)` | Marks tab as exited |

#### Buffer Replay Mechanism
```
Terminal tab produces output -> Tauri event "terminal-output" ->
  terminalStore.handleOutput(tabId, data) -> appends to tab.buffer[]

If tab is active -> output written directly to xterm instance
If tab is inactive -> data stays in buffer (emit triggers TerminalPanel to replay)

On tab switch (switchTab):
  TerminalPanel replays tab.buffer[] from writtenIndex to end ->
  calls markWritten(tabId) to update writtenIndex
```

#### Settings Persistence
Terminal settings use **`localStorage`** (NOT the SQLite database). Keys:
- `terminal-theme-name`
- `terminal-height`
- `terminal-font-size`
- `terminal-dock-position`
- `terminal-mode`
- `terminal-tab-switch-shortcut`

Fallback defaults are applied when keys are missing from localStorage.

#### Themes (`src/data/terminalThemes.ts`)
8 themes, each defines 16 ANSI colors + background + foreground + cursor:

| Theme | Category |
|---|---|
| Catppuccin Mocha | dark (default) |
| Catppuccin Latte | light |
| Solarized Dark | dark |
| Solarized Light | light |
| Dracula | dark |
| Nord | dark |
| Gruvbox Dark | dark |
| Tokyo Night | dark |

Each is a `TerminalTheme` object compatible with xterm.js's `terminal.applyTheme()`.

#### Tab Switch Shortcuts (`src/data/terminalShortcuts.ts`)
6 configurations:

| ID | Keys |
|---|---|
| `ctrl-tab` | Ctrl+Tab / Ctrl+Shift+Tab |
| `ctrl-bracket` | Ctrl+] / Ctrl+[ |
| `ctrl-pagedown` | Ctrl+PageDown / Ctrl+PageUp |
| `cmd-bracket` | Cmd+] / Cmd+[ |
| `alt-bracket` | Alt+] / Alt+[ |
| `alt-tab` | Alt+Tab / Alt+Shift+Tab |

### Backend (`src-tauri/src/commands/terminal.rs`)

#### Architecture
Each tab = a `portable-pty` child process + background reader thread:

```
create_terminal_tab:
  1. Generate UUID tab_id
  2. native_pty_system().openpty(size) -> master + slave
  3. build_shell_command() -> spawns user's shell in slave
  4. Obtain reader (master.try_clone_reader()) + writer (master.take_writer())
  5. Spawn reader thread:
     - Loop: reader.read(&mut buf)
     - On data: emit_handle.emit("terminal-output", { tab_id, data })
     - On EOF/error: break, child.wait(), emit("terminal-exited", { tab_id, code })
  6. Store TabEntry in AppState via Mutex<HashMap<String, TabEntry>>
  7. Return TerminalTab { id, pid, title }
```

#### Shell Configuration
`build_shell_command()` sets:
- Shell: `$SHELL` env var (fallback: `/bin/zsh` on macOS, `/bin/bash` on Linux, `cmd.exe` on Win)
- Flags: `-l` (login) + `-i` (interactive) on Unix
- Env: `TERM=xterm-256color`, `COLORTERM=truecolor`, `TERM_PROGRAM=xterm.js`, `LANG=en_US.UTF-8`, `LC_CTYPE=en_US.UTF-8`
- **Fallback**: If login shell fails to spawn, retries with `-i` only (no `-l`)

#### Resize / SIGWINCH
```
Frontend sends resize(rows, cols) -> Rust resize_terminal command:
  1. master.resize(PtySize { rows, cols, ... })
  2. macOS: master.process_group_leader() -> tcgetpgrp() on PTY fd
  3. libc::killpg(pgid, SIGWINCH) -> foreground app (vim/less) receives resize signal
```

Same approach as VS Code's node-pty.

#### Terminal Commands
| Command | Signature | Description |
|---|---|---|
| `create_terminal_tab` | `() -> TerminalTab` | Spawns a new PTY shell process |
| `terminal_write` | `(tab_id, data) -> ()` | Writes keystrokes to PTY |
| `resize_terminal` | `(tab_id, rows, cols) -> ()` | Resizes PTY, sends SIGWINCH |
| `close_terminal_tab` | `(tab_id) -> ()` | Kills process, joins reader thread |
| `list_terminal_tabs` | `() -> Vec<TerminalTab>` | Lists active tabs |

### Types

```typescript
// src/types/terminal.ts
interface TerminalTheme {
  name: string;
  category: "dark" | "light";
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  // 16 ANSI colors:
  black: string; red: string; green: string; yellow: string;
  blue: string; magenta: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string;
  brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
}

interface TabSwitchShortcut {
  id: string;
  name: string;
  keys: string;
  handler: (e: KeyboardEvent) => boolean;
}

interface TerminalTab {
  id: string;
  pid: number;
  title: string;
  buffer: string[];
  writtenIndex: number;
  isRunning: boolean;
  exitCode: number | null;
}
```

## Data Flow

```
Key pressed in xterm -> terminal.onData() -> terminalStore.write(data)
  -> invoke("terminal_write", { tabId, data }) -> writer.write_all(data.as_bytes())
  -> PTY forwards input to shell process

Shell output -> PTY master -> reader thread -> emit("terminal-output", { tab_id, data })
  -> Tauri event listener -> terminalStore.handleOutput(tabId, data)
  -> If active: xterm.write(data); else: buffer appended

Tab switch -> terminalStore.switchTab(id) -> TerminalPanel replays buffer
  -> xterm.write() for each buffered chunk from writtenIndex -> markWritten()
```

## Commands

```bash
# Run terminal-related tests
npx vitest run src/test/terminal.spec.ts src/test/terminal-themes.spec.ts src/test/terminal-settings.spec.tsx

# Run Rust terminal tests (shell command building)
cd src-tauri && cargo test terminal

# Run all tests
npm test && npm run test:rust
```

## Important Gotchas

1. **PTY event relay is via Tauri events, NOT IPC invoke().** Terminal output goes through `tauri::Emitter::emit("terminal-output", payload)` and is received in the frontend via `listen("terminal-output")` from `@tauri-apps/api/event`. Do NOT try to route terminal output through `invoke()` — it would block.

2. **xterm.js instance lifecycle is critical.** Each tab creates a `new Terminal()` instance. On tab close, you must call `term.dispose()` AND the Rust `close_terminal_tab` command. The Rust side kills the process and joins the reader thread.

3. **Buffer replay prevents data loss.** When switching tabs, the buffered output for the newly active tab is replayed from `writtenIndex` to the end of `buffer[]`. Without this, output that arrived while the tab was inactive would be lost.

4. **Settings use localStorage, not SQLite.** Unlike AI provider settings (which use the `settings` SQLite table), terminal settings are persisted to localStorage. This keeps them fast and avoids the Tauri IPC round-trip.

5. **Font size is clamped between 9 and 32.** The store's `setFontSize()` clamps to min 9 and max 32. Terminal height is clamped between 100px and 95% of viewport height.

6. **The default terminal size is 24 rows x 80 cols.** The initial PTY size uses these values. The xterm.js fit addon recalculates on mount and sends a resize.

7. **First tab opens automatically.** When the terminal panel is toggled open and there are no tabs, `toggle()` automatically calls `createTab()`.

8. **Tab switch shortcut is configurable.** The `tabSwitchShortcutId` maps to one of 6 `TabSwitchShortcut` configurations from `terminalShortcuts.ts`. The active configuration determines which keyboard handler is registered for tab navigation.
