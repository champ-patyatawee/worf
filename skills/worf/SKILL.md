---
name: worf
description: Full-stack Tauri 2 desktop app — Notes, Kanban, AI Chat, Terminal, Pomodoro — React 19 + TypeScript + Rust + SQLite
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **worf** desktop productivity app (Tauri 2 + React 19 + Rust)
- Create or modify frontend pages/components in `src/`
- Create or modify Rust backend commands in `src-tauri/src/commands/`
- Add database migrations and schema changes
- Write and run tests (Vitest frontend, `cargo test` backend, WDIO E2E)
- Understand and follow the project's architecture, state management, and IPC patterns

## When to use me
Use when working on any part of the **worf** desktop application — adding features, fixing bugs, refactoring, writing tests, or debugging. Invoke this skill whenever the user mentions the "worf" project, refers to files under `/Users/champp/Champ/worf/`, or asks to build/modify a Notes/Kanban/Chat/Terminal/Pomodoro feature.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust backend) |
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | TailwindCSS + CSS custom properties |
| IPC (frontend ↔ backend) | `@tauri-apps/api/core` `invoke()` |
| Rich text editor | TipTap via `novel` library |
| Terminal emulator | `@xterm/xterm` + addons (fit, search, web-links, unicode11) |
| PTY backend | `portable-pty` (Rust) |
| Database | SQLite via `rusqlite` (WAL mode, foreign keys) |
| AI Chat streaming | SSE via `fetch()` with `ReadableStream` |
| State management | Custom pub/sub stores (no Zustand/Redux) |
| Frontend tests | Vitest + Testing Library |
| Backend tests | `cargo test` |
| E2E tests | WDIO (WebDriverIO) |

## Architecture

### Frontend (`src/`)

```
src/
├── main.tsx                              # React entry point, renders <App />
├── App.tsx                               # React Router setup + AppLayout wrapper
├── index.css                             # Global styles + CSS custom properties (--color-bg-*, --color-border-*)
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx                 # Root layout: IconSidebar + <Outlet /> + TerminalPanel overlay
│   │   └── IconSidebar.tsx               # Left nav sidebar with icon buttons for each module
│   │
│   ├── notes/
│   │   ├── NoteEditor.tsx                # Rich text editor (novel/TipTap) with AI integration
│   │   ├── NoteSidebar.tsx               # Folder tree + page list in left sidebar
│   │   ├── extensions.ts                 # TipTap extension configuration
│   │   ├── slash-command.tsx             # /-command menu (AI generate, headings, lists, etc.)
│   │   ├── NodeSelector.tsx              # Block type selector (heading levels, list types)
│   │   ├── TextButtons.tsx               # Bold/italic/underline/strikethrough toolbar buttons
│   │   ├── GhostText.tsx                 # AI autocomplete overlay (ghost text preview)
│   │   ├── GenerateInput.tsx             # AI generation input popup (e.g., "write a summary")
│   │   ├── AIEditInput.tsx               # AI edit instruction input (e.g., "make this more concise")
│   │   └── useAICompletion.ts            # Hook for AI completion with debounce
│   │
│   ├── kanban/
│   │   ├── KanbanBoard.tsx               # Main board: 3 columns (todo/in_progress/done) with drag-and-drop
│   │   ├── KanbanSidebar.tsx             # List of boards + create/delete board controls
│   │   ├── KanbanColumn.tsx              # Single column using @dnd-kit sortable context
│   │   ├── KanbanTaskCard.tsx            # Draggable task card with priority badge (low/medium/high/urgent)
│   │   └── KanbanTaskModal.tsx           # Create/edit task modal dialog
│   │
│   ├── chat/
│   │   ├── ChatSessionPage.tsx           # Chat UI with message list + input area
│   │   ├── ChatSessionSidebar.tsx        # Session list sidebar with create/delete
│   │   ├── MessageList.tsx               # Renders message history with markdown support
│   │   ├── ChatMessageInput.tsx          # Input with auto URL detection + send
│   │   ├── UrlSourceCard.tsx             # Shows fetched URL content as context card
│   │   └── AIMessage.tsx                 # AI message bubble with streaming content
│   │
│   ├── dashboard/
│   │   ├── Dashboard.tsx                 # Home page — grid layout of widgets
│   │   ├── ClockWidget.tsx               # Digital clock
│   │   ├── PomodoroWidget.tsx            # Pomodoro timer (start/stop, work/break toggle)
│   │   ├── CalendarWidget.tsx            # Monthly calendar
│   │   ├── TaskOverviewWidget.tsx        # Kanban task summary grouped by status
│   │   ├── NoteOverviewWidget.tsx        # Recently modified notes list
│   │   ├── ProjectsWidget.tsx            # Board list overview
│   │   └── index.ts                      # Widget registry / exports
│   │
│   ├── terminal/
│   │   └── TerminalPanel.tsx             # xterm.js terminal with multi-tab support, buffer replay
│   │
│   ├── ui/                               # Reusable UI primitives
│   │   ├── button.tsx                    # Styled button component (variants, sizes)
│   │   ├── popover.tsx                   # Radix UI popover
│   │   ├── select.tsx                    # Custom select dropdown
│   │   └── separator.tsx                 # Radix UI separator
│   │
│   └── common/
│       ├── CreateDialog.tsx              # Reusable create-entity dialog modal
│       └── KeyRecorder.tsx              # Keyboard shortcut recorder (capture key combos)
│
├── pages/
│   ├── Dashboard.tsx                     # Dashboard page route
│   ├── Notes.tsx                         # Notes page route
│   ├── Kanban.tsx                        # Kanban page route
│   ├── chat/ChatSessionPage.tsx          # AI Chat page route
│   └── settings/
│       ├── SettingsLayout.tsx            # Settings sidebar navigation + outlet
│       ├── AIProvider.tsx                # AI provider CRUD page
│       ├── NoteSettings.tsx              # Default AI provider selection for notes
│       ├── PromptTemplates.tsx           # Prompt template CRUD page
│       ├── TerminalSettings.tsx          # Terminal: theme, font, dock position, mode, shortcuts
│       └── NavigationShortcuts.tsx       # Navigation keyboard shortcut configuration
│
├── stores/                               # Custom pub/sub stores (no Zustand/Redux)
│   ├── terminalStore.ts                  # Terminal state: tabs, settings, I/O event relay
│   ├── chatSessionStore.ts               # Chat sessions, messages, URL fetching, SSE streaming
│   ├── promptTemplateStore.ts            # Prompt template CRUD state
│   └── navigationShortcutStore.ts        # Navigation shortcuts (persisted to localStorage)
│
├── services/
│   └── aiService.ts                      # AI LLM calls for Notes (generate, edit, complete modes)
│
├── data/                                 # Static config data
│   ├── terminalThemes.ts                 # 8 themes: Catppuccin, Solarized, Dracula, Nord, Gruvbox, Tokyo Night, etc.
│   ├── terminalShortcuts.ts             # Tab switch shortcut configs
│   └── navigationShortcuts.ts           # Default navigation shortcut bindings
│
├── types/
│   ├── index.ts                          # Core types: Folder, Page, Board, Task, TaskStatus, TaskPriority
│   └── terminal.ts                       # TerminalTheme, TabSwitchShortcut, TerminalTab types
│
└── test/
    ├── setup.ts                          # Vitest setup (global mocks, cleanup)
    ├── terminal.spec.ts                  # Terminal store unit tests
    ├── terminal-themes.spec.ts           # Terminal theme data tests
    ├── terminal-settings.spec.tsx        # Terminal settings component tests
    ├── slash-commands.spec.ts            # Slash command configuration tests
    ├── extensions.spec.ts                # TipTap extension tests
    ├── kanban.spec.ts                    # Kanban store/logic tests
    ├── board-tasks.spec.ts               # Board/task combined tests
    ├── notes.spec.ts                     # Notes store/logic tests
    ├── dashboard.spec.ts                 # Dashboard widget tests
    ├── url-reader.spec.ts                # URL fetch/parse utility tests
    ├── message-list.spec.tsx             # Message list component tests
    └── select.spec.tsx                   # Select component tests
```

### Backend (`src-tauri/`)

```
src-tauri/
├── Cargo.toml                            # Rust dependencies (rusqlite, serde, reqwest, portable-pty, etc.)
├── tauri.conf.json                       # Tauri config: window dimensions, permissions, icons, bundle settings
├── migrations/
│   └── 001_init.sql                      # SQLite schema: 9 tables + 6 indexes
└── src/
    ├── main.rs                           # Binary entry point, calls lib::run()
    ├── lib.rs                            # Tauri builder: manages state (SqlitePool), registers all commands
    ├── db.rs                             # SQLite initialization (WAL mode, foreign keys) + 13 unit tests
    └── commands/
        ├── mod.rs                        # Module declarations (pub mod for each command file)
        ├── folders.rs                    # Folder CRUD: create, list, rename, delete
        ├── pages.rs                      # Page CRUD: create (with auto-slug), get, update, delete, list, list_in_folder
        ├── boards.rs                     # Board CRUD: create, list, get (with tasks), delete
        ├── tasks.rs                      # Task CRUD: create, update, move (with position re-ordering), delete
        ├── providers.rs                  # AI provider CRUD (create, list, update, delete) + settings key-value store (get/set)
        ├── chats.rs                      # Chat session CRUD, message CRUD (with pagination), prompt template CRUD
        ├── url_fetch.rs                  # URL fetch via reqwest: extracts title, meta description, body text; persists to message_url_contexts
        ├── pomodoro.rs                   # Pomodoro timer: background thread, tick events, work/break auto-switch
        └── terminal.rs                   # PTY-based terminal: multi-tab, resize (SIGWINCH), input/output event relay
```

## Database Schema (SQLite)

### Tables

| Table | Columns | Foreign Keys | Notes |
|---|---|---|---|
| `folders` | `id` (TEXT PK), `name` (TEXT), `icon` (TEXT), `parent_id` (TEXT) | — | Folder hierarchy for notes |
| `pages` | `id` (TEXT PK), `title` (TEXT), `content` (TEXT), `slug` (TEXT), `folder_id` (TEXT), `created_at`, `updated_at` | FK→`folders(id)` ON DELETE SET NULL | Auto-generates slug from title on create |
| `boards` | `id` (TEXT PK), `name` (TEXT), `slug` (TEXT) | — | Kanban boards, slug allows URL-based lookup |
| `tasks` | `id` (TEXT PK), `title` (TEXT), `description` (TEXT), `status` (TEXT), `priority` (TEXT), `position` (INT), `board_id` (TEXT) | FK→`boards(id)` ON DELETE CASCADE | `position` used for manual re-ordering |
| `ai_providers` | `id` (TEXT PK), `name` (TEXT), `provider` (TEXT), `base_url` (TEXT), `api_key` (TEXT), `model` (TEXT) | — | LLM provider configs |
| `chat_sessions` | `id` (TEXT PK), `title` (TEXT), `created_at`, `updated_at` | — | Chat conversation sessions |
| `chat_messages` | `id` (TEXT PK), `chat_id` (TEXT), `role` (TEXT), `content` (TEXT), `created_at` | FK→`chat_sessions(id)` ON DELETE CASCADE | Supports pagination |
| `prompt_templates` | `id` (TEXT PK), `name` (TEXT), `content` (TEXT), `category` (TEXT) | — | Reusable prompt templates |
| `settings` | `key` (TEXT PK), `value` (TEXT) | — | Generic key-value settings store |
| `message_url_contexts` | `id` (TEXT PK), `message_id` (TEXT), `url` (TEXT), `title` (TEXT), `description` (TEXT), `content` (TEXT) | FK→`chat_messages(id)` ON DELETE CASCADE | Fetched URL content attached to messages |

### Indexes
- `pages(folder_id)`, `pages(slug)` (unique)
- `tasks(board_id)`, `tasks(status)`
- `chat_messages(chat_id)`
- `message_url_contexts(message_id)`

## Design Patterns

### State Management — Custom Pub/Sub Stores
No external state library. Each store follows this pattern:

```typescript
type Listener = () => void;
const listeners = new Set<Listener>();
let state: State = { ... };

function emit() {
  listeners.forEach((l) => l());
}

export const store = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get state() {
    return state;
  },
  // ... action functions that mutate `state` and call `emit()`
};
```

React components subscribe via `useSyncExternalStore` or a custom `useStore` hook.

### IPC Pattern (Frontend → Rust Backend)
All database operations go through Tauri IPC using `invoke()`:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Calling a Rust command
const result = await invoke<Folder[]>('list_folders');
// With arguments
const page = await invoke<Page>('create_page', { title: 'My Page', folderId: 'abc' });
```

Rust side in `commands/*.rs`:
```rust
#[tauri::command]
pub fn list_folders(state: tauri::State<'_, AppState>) -> Result<Vec<Folder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // ... query using rusqlite
}
```

All commands are registered in `lib.rs`:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::folders::create_folder,
            commands::folders::list_folders,
            // ... all commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Terminal PTY Architecture
- Each tab gets its own `portable-pty` child process + reader thread
- Output relayed via `tauri::Emitter::emit("terminal-output", payload)`
- Terminal resize sends SIGWINCH via `pty.resize()`
- Buffer replay stored per-tab for seamless tab switching

### AI Chat Streaming
- Frontend fetches LLM API directly (no Rust proxy for streaming)
- SSE parsing via `ReadableStream` in the browser
- URL auto-detection: regex in `ChatMessageInput` detects URLs → calls Rust `fetch_url` command → content injected as system context

### Styling Convention
- **Brutalist design**: thick borders, box shadows, high contrast
- CSS custom properties for theming: `--color-bg-primary`, `--color-bg-secondary`, `--color-border-primary`, `--color-text-primary`, etc.
- TailwindCSS utility classes for layout/spacing
- Component-level `className` props for customization

## Key Features & How They Work

### 1. Notes (Rich Text)
- **Editor**: TipTap via `novel` library
- **Slash commands**: `/` opens command menu (AI generate, headings, lists, blockquotes)
- **AI integration**: Three modes — **generate** (write new content), **edit** (transform selection), **complete** (autocomplete with ghost text)
- **Content storage**: HTML persisted to SQLite via Rust `update_page` command
- **Folder hierarchy**: Folders can nest (parent_id), pages belong to folders or are unparented

### 2. Kanban
- **3 columns**: `todo`, `in_progress`, `done`
- **Drag & drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Position ordering**: Each task has a `position` integer; re-ordering recalculates positions
- **Priorities**: `low`, `medium`, `high`, `urgent` with color-coded badges
- **Task modal**: Create/edit via `KanbanTaskModal` with title, description, priority fields

### 3. AI Chat
- **Session management**: Multiple chat sessions, created/deleted from sidebar
- **Streaming**: SSE from LLM provider, parsed client-side
- **URL fetching**: URLs in messages are auto-detected, fetched via Rust `reqwest`, HTML parsed, injected as system context
- **Message pagination**: Server-side pagination via `chat_messages` query with limit/offset

### 4. Terminal Emulator
- **Multi-tab**: Each tab has its own PTY + xterm.js instance
- **Buffer replay**: On tab switch, buffered output is replayed to xterm.js
- **Resize**: Rust sends SIGWINCH to PTY on terminal resize
- **Themes**: 8 built-in themes (Catppuccin, Solarized, Dracula, Nord, Gruvbox, Tokyo Night, etc.)
- **Settings**: Font size, font family, theme, dock position (bottom/right), mode (persistent/toggle)

### 5. Pomodoro Timer
- **Background thread**: Rust `pomodoro.rs` runs a dedicated thread emitting tick events
- **Work/break cycle**: Auto-switches between work and break intervals
- **Dashboard widget**: `PomodoroWidget` displays timer with start/stop controls

### 6. Dashboard
- **Widget grid**: Clock, Pomodoro, Calendar, Task Overview, Recent Notes, Projects
- **Widget registry**: Centralized in `components/dashboard/index.ts`

## Development Commands

```bash
# Start Vite dev server (browser-only, no Tauri)
npm run dev

# Full Tauri desktop dev mode
npm run tauri:dev

# Production build (.dmg/.msi/.AppImage)
npm run tauri:build

# Tauri dev mode with webdriver for E2E testing
npm run tauri:dev:webdriver
```

## Testing Commands

```bash
# Frontend unit tests (Vitest)
npm test

# Rust backend tests
npm run test:rust

# E2E tests (WDIO)
npm run test:e2e

# Run all tests
npm test && npm run test:rust && npm run test:e2e
```

## Important Conventions & Gotchas

### Conventions
1. **All IDs are UUIDs** stored as TEXT in SQLite. Generate client-side with `crypto.randomUUID()`.
2. **Slug auto-generation** for pages and boards: derived from title, lowercased, hyphenated.
3. **Task positions** are integers, recalculated on drag-and-drop reordering.
4. **Imports**: Use absolute imports from `src/` (Vite alias configured).
5. **CSS**: Always prefer CSS custom properties from `index.css` over raw color values.
6. **Error handling**: Rust commands return `Result<T, String>` — errors propagate to frontend as rejected promises.
7. **State stores**: Always use the pub/sub pattern. Do NOT introduce Zustand, Redux, Jotai, or other state libraries.
8. **Naming**: Files use kebab-case. Components use PascalCase. Functions use camelCase.

### Gotchas
1. **Terminal PTY event relay**: Terminal output goes through Tauri events (`terminal-output`, `terminal-exited`), not IPC `invoke()`. Listen with `listen()` from `@tauri-apps/api/event`.
2. **AI Chat streaming is frontend-side**: The Rust backend does NOT proxy AI streaming. The frontend fetches the LLM API directly. Do NOT route streaming through Tauri commands.
3. **AI provider API keys are stored in SQLite**: Keys are stored in the `ai_providers` table (plaintext — single-user app assumption).
4. **Pomodoro background thread**: The Pomodoro timer runs on a Rust thread. It continues even if the frontend closes/reopens. State syncs via Tauri events.
5. **Database migrations**: Migration `001_init.sql` is run once on first launch. Do NOT modify it after release — create a new `002_*.sql` migration.
6. **Settings duality**: Terminal settings and nav shortcuts use `localStorage` (frontend-only). AI provider settings use the SQLite `settings` table (backend).
7. **Dnd-kit caveats**: Drag-and-drop in KanbanBoard uses `@dnd-kit` with `useSortable`. Ensure `KanbanTaskCard` wraps content in a `<SortableContext>` and passes the correct `id` prop.
8. **Novel/TipTap content**: Stored as HTML strings. When loading from the database, set editor content via `editor.commands.setContent(html)`. When saving, use `editor.getHTML()`.
9. **xterm.js instance lifecycle**: Each terminal tab creates its own `Terminal` instance. On tab close, call `term.dispose()` AND the Rust `close_terminal_tab` command to kill the PTY process.
10. **URL fetch HTML parsing**: The Rust `url_fetch.rs` uses a simple regex/string-based HTML parser for extracting title, meta description, and body text. It is NOT a full DOM parser.

## Dev Credentials
- Admin login: `admin@worf.dev` / `123456`