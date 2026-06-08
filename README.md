# Worf — Desktop App

A single-user desktop app for Notes and Kanban, built with Tauri 2 + React + SQLite.

---

## Project Structure

```
worf/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Router + layout
│   ├── index.css                 # Global styles + CSS variables
│   ├── components/
│   │   ├── layout/               # AppLayout, IconSidebar
│   │   ├── notes/                # NoteEditor, NoteSidebar, novel extensions
│   │   │   ├── NoteEditor.tsx    # Rich text editor (TipTap/novel)
│   │   │   ├── NoteSidebar.tsx   # Folder tree + page list
│   │   │   ├── extensions.ts     # TipTap extension config
│   │   │   ├── slash-command.tsx # /-command menu items
│   │   │   ├── NodeSelector.tsx  # Heading/list selector toolbar
│   │   │   ├── TextButtons.tsx   # Bold/italic/underline toolbar
│   │   │   ├── GhostText.tsx     # AI autocomplete overlay
│   │   │   ├── GenerateInput.tsx # AI generation input
│   │   │   ├── AIEditInput.tsx   # AI edit instruction input
│   │   │   └── useAICompletion.ts# AI completion hook
│   │   ├── kanban/               # KanbanBoard, columns, task cards
│   │   │   ├── KanbanBoard.tsx   # Main board with 3 columns
│   │   │   ├── KanbanSidebar.tsx # Board list + create
│   │   │   ├── KanbanColumn.tsx  # Single column with drag-drop zone
│   │   │   ├── KanbanTaskCard.tsx# Draggable task card
│   │   │   └── KanbanTaskModal.tsx # Create/edit task modal
│   │   └── ui/                   # Button, Popover, Separator
│   ├── pages/
│   │   ├── Dashboard.tsx         # Home with create buttons
│   │   ├── Notes.tsx             # Notes page (sidebar + editor)
│   │   ├── Kanban.tsx            # Kanban page (sidebar + board)
│   │   └── settings/             # AIProvider, NoteSettings, SettingsLayout
│   ├── services/
│   │   └── aiService.ts          # LLM API calls from frontend
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── test/                     # Frontend tests (Vitest)
│       ├── setup.ts
│       ├── slash-commands.spec.ts
│       ├── extensions.spec.ts
│       ├── kanban.spec.ts
│       └── dashboard.spec.ts
│
├── src-tauri/                    # Tauri Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app config
│   ├── migrations/
│   │   └── 001_init.sql          # SQLite schema
│   └── src/
│       ├── main.rs               # Entry point
│       ├── lib.rs                # Tauri builder + command registration
│       ├── db.rs                 # SQLite init + tests
│       └── commands/             # Tauri IPC commands
│           ├── folders.rs        # Folder CRUD
│           ├── pages.rs          # Page CRUD
│           ├── boards.rs         # Board CRUD (id + slug lookup)
│           ├── tasks.rs          # Task CRUD (move, reorder)
│           └── providers.rs      # AI provider CRUD + settings
│
├── package.json                  # Node deps + scripts
├── vite.config.ts                # Vite config
├── vitest.config.ts              # Vitest config
├── tailwind.config.js            # Tailwind + typography plugin
├── postcss.config.js
├── tsconfig.json
└── run.sh                        # Dev launch script
```

---

## Commands

### Development

```bash
# Launch the Tauri desktop app (Vite dev server + Rust backend)
npx tauri dev

# Or using the script
./run.sh
```

### Debug

```bash
# Launch with devtools/console visible
npx tauri dev -- --debug

# Or set RUST_LOG for backend logs
RUST_LOG=debug npx tauri dev
```

### Tests

```bash
# Frontend tests (Vitest)
npm test

# Watch mode
npm run test:watch

# Rust backend tests (SQLite in-memory)
npm run test:rust

# All tests
npm test && npm run test:rust
```

### Build

```bash
# Production build (creates .dmg / .msi / .AppImage)
npx tauri build

# Frontend only
npm run build
```

---

## Features

| Feature | Description |
|---|---|
| **Notes** | Rich text editor with TipTap/novel, slash commands, AI generate, AI edit, ghost autocomplete |
| **Kanban** | Drag-and-drop task boards, modal create/edit, priority badges, move buttons |
| **AI Chat** | Schema ready (ai_providers, chat_sessions, chat_messages tables) |
| **Settings** | AI provider CRUD, note AI provider selection |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19 + Vite + TypeScript + TailwindCSS |
| Backend | Rust (rusqlite) |
| Database | SQLite (single file, zero config) |
| Rich text | TipTap via novel |
| Tests | Vitest + Testing Library (frontend), built-in `cargo test` (backend) |
