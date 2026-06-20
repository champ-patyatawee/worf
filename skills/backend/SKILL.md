---
name: backend
description: Rust Tauri 2 backend — SQLite database, migrations, commands, IPC architecture
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Rust backend** for the worf desktop app (Tauri 2)
- Manage SQLite database initialization, schema migrations, and WAL mode
- Create or modify Tauri commands in `src-tauri/src/commands/`
- Handle state management with `AppState` (Mutex-protected database + terminal tabs)
- Register all commands in the Tauri builder and wire up plugins

## When to use me
Use when working on any backend/infrastructure concern — adding new Tauri commands, modifying the database schema, creating migrations, changing Rust dependencies, fixing IPC patterns, or debugging database issues. Invoke this skill whenever files under `src-tauri/` are involved.

## Architecture

### Project Structure

```
src-tauri/
├── Cargo.toml                 # Rust dependencies
├── tauri.conf.json            # Tauri config: window, permissions, icons, bundle
├── migrations/
│   └── 001_init.sql           # SQLite schema (9 tables + 6 indexes)
└── src/
    ├── main.rs                # Binary entry: calls worf::run()
    ├── lib.rs                 # Tauri builder: state, commands, plugins
    ├── db.rs                  # Database init, migrations, in-memory testing
    └── commands/
        ├── mod.rs             # Module declarations
        ├── folders.rs         # Folder CRUD (4 commands)
        ├── pages.rs           # Page CRUD (6 commands)
        ├── boards.rs          # Board CRUD (4 commands)
        ├── tasks.rs           # Task CRUD (4 commands)
        ├── providers.rs       # AI provider CRUD + settings get/set (6 commands)
        ├── chats.rs           # Chat session + message + prompt template CRUD (9 commands)
        ├── url_fetch.rs       # URL fetching via reqwest (3 commands)
        ├── pomodoro.rs        # Pomodoro timer with background thread (3 commands)
        └── terminal.rs        # PTY terminal spawn/I/O/resize (5 commands)
```

### Dependencies (`Cargo.toml`)

| Crate | Purpose |
|---|---|
| `tauri` 2.x | Desktop app framework |
| `rusqlite` (bundled) | SQLite database |
| `serde` + `serde_json` | Serialization/deserialization |
| `reqwest` (json) | HTTP client for URL fetching |
| `uuid` (v4) | UUID generation |
| `chrono` (serde) | Timestamps |
| `portable-pty` | PTY terminal backend |
| `libc` | SIGWINCH signal delivery (Unix) |
| `tauri-plugin-dialog` | Native dialogs |
| `tauri-plugin-fs` | Filesystem access |
| `tauri-plugin-webdriver` | E2E testing support |

### Entry Point & Builder (`lib.rs`)

```rust
struct AppState {
    pub db: Mutex<Database>,
    pub terminal_tabs: Mutex<HashMap<String, commands::terminal::TabEntry>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            let database = Database::new(&app_dir)?;
            app.manage(AppState {
                db: Mutex::new(database),
                terminal_tabs: Mutex::new(HashMap::new()),
            });
            app.manage(commands::pomodoro::PomodoroManager::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ... all 35+ commands
        ])
        .run(tauri::generate_context!())
}
```

### Database Initialization (`db.rs`)

```rust
pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn new(app_dir: &Path) -> Result<Self> {
        let db_path = app_dir.join("worf.db");
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;    // WAL mode for concurrent reads
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;     // Enforce FK constraints
        conn.execute_batch(include_str!("../migrations/001_init.sql"))?;  // Run migrations
        Ok(Database { conn })
    }
}
```

### Pattern: Command Registration

Every command must be:
1. Defined as a `pub fn` with `#[tauri::command]` attribute in its module file
2. Declared as `pub mod <name>;` in `commands/mod.rs`
3. Listed in `tauri::generate_handler![]` in `lib.rs`

### Pattern: State Access

```rust
#[tauri::command]
pub fn list_folders(state: tauri::State<'_, AppState>) -> Result<Vec<Folder>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // Query using db.conn
}
```

All commands return `Result<T, String>` — errors propagate to the frontend as rejected promises.

### Pattern: UUID Generation

All IDs are v4 UUIDs generated client-side (`crypto.randomUUID()` in JS) or server-side (`uuid::Uuid::new_v4()` in Rust). Stored as TEXT in SQLite.

## Database Schema (9 tables)

| Table | Columns | Foreign Keys | Notes |
|---|---|---|---|
| `folders` | id (TEXT PK), name (TEXT), created_at, updated_at | — | Note folder hierarchy |
| `pages` | id (TEXT PK), title (TEXT), slug (TEXT UNIQUE), content (TEXT), folder_id (TEXT), created_at, updated_at | FK->folders(id) ON DELETE SET NULL | Slug auto-generated from title |
| `boards` | id (TEXT PK), name (TEXT), slug (TEXT UNIQUE), description (TEXT), created_at, updated_at | — | Kanban boards |
| `tasks` | id (TEXT PK), title (TEXT), description (TEXT), priority (TEXT), status (TEXT), position (INT), board_id (TEXT), created_at, updated_at | FK->boards(id) ON DELETE CASCADE | Position for re-ordering |
| `ai_providers` | id (TEXT PK), name (TEXT), provider (TEXT), api_url (TEXT), api_key (TEXT), model (TEXT), is_active (INT), is_default (INT), created_at, updated_at | — | LLM provider configs |
| `chat_sessions` | id (TEXT PK), title (TEXT), model_id (TEXT), prompt_template_id (TEXT), created_at, updated_at | — | Chat conversations |
| `chat_messages` | id (TEXT PK), chat_id (TEXT), role (TEXT), content (TEXT), created_at | FK->chat_sessions(id) ON DELETE CASCADE | Paginated |
| `prompt_templates` | id (TEXT PK), name (TEXT), content (TEXT), description (TEXT), is_default (INT), created_at, updated_at | — | Reusable prompts |
| `settings` | id (TEXT PK), key (TEXT UNIQUE), value (TEXT), created_at, updated_at | — | Key-value store |
| `message_url_contexts` | id (TEXT PK), message_id (TEXT), url (TEXT), title (TEXT), content (TEXT), created_at | FK->chat_messages(id) ON DELETE CASCADE | Fetched URL content |

### Indexes

```sql
CREATE INDEX idx_pages_folder ON pages(folder_id);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_url_contexts_message ON message_url_contexts(message_id);
```

## Complete Command Reference (~35 commands)

### Notes
| Command | Signature | Description |
|---|---|---|
| `create_folder` | `(name: String) -> Folder` | Create a folder |
| `list_folders` | `() -> Vec<Folder>` | List all folders |
| `rename_folder` | `(id: String, name: String) -> Folder` | Rename folder |
| `delete_folder` | `(id: String) -> ()` | Delete folder (pages unlinked) |
| `create_page` | `(title: String, folder_id: Option<String>) -> Page` | Create page with auto-slug |
| `get_page` | `(id: String) -> Page` | Get page by ID |
| `update_page` | `(id: String, title: Option<String>, content: Option<String>) -> Page` | Update title (re-slugs) and/or content |
| `delete_page` | `(id: String) -> ()` | Delete page |
| `list_pages` | `() -> Vec<Page>` | List root pages (folder_id IS NULL) |
| `list_pages_in_folder` | `(folder_id: String) -> Vec<Page>` | List pages in folder |

### Kanban
| Command | Signature | Description |
|---|---|---|
| `create_board` | `(name: String, description: Option<String>) -> Board` | Create board with auto-slug |
| `list_boards` | `() -> Vec<Board>` | List all boards |
| `get_board` | `(id_or_slug: String) -> BoardWithTasks` | Get board by ID or slug (with tasks) |
| `delete_board` | `(id: String) -> ()` | Delete board (cascades to tasks) |
| `create_task` | `(title: String, description?, priority?, status?, board_id: String) -> Task` | Create task at end of column |
| `update_task` | `(id: String, title?, description?, priority?, status?) -> Task` | Update task fields |
| `move_task` | `(id: String, status: String, position: Option<i32>) -> Task` | Move task + re-index column |
| `delete_task` | `(id: String) -> ()` | Delete task |

### AI Providers & Settings
| Command | Signature | Description |
|---|---|---|
| `list_providers` | `() -> Vec<AIProvider>` | List all AI providers |
| `create_provider` | `(name, provider, api_url, api_key, model) -> AIProvider` | Create provider |
| `update_provider` | `(id, name?, provider?, api_url?, api_key?, model?) -> AIProvider` | Update provider |
| `delete_provider` | `(id: String) -> ()` | Delete provider |
| `get_setting` | `(key: String) -> Option<String>` | Get key-value setting |
| `set_setting` | `(key: String, value: String) -> ()` | Set key-value setting |

### Chat
| Command | Signature | Description |
|---|---|---|
| `list_chat_sessions` | `() -> Vec<ChatSession>` | List all sessions |
| `create_chat_session` | `(title?, model_id?, prompt_template_id?) -> ChatSession` | Create session |
| `update_chat_session` | `(id, title?, model_id?, prompt_template_id?) -> ChatSession` | Update session |
| `delete_chat_session` | `(id: String) -> ()` | Delete session (cascades messages) |
| `get_chat_messages` | `(chat_id: String, before: Option<String>, limit: i64) -> Vec<ChatMessage>` | Paginated messages |
| `create_chat_message` | `(chat_id, role, content) -> ChatMessage` | Create message |
| `list_prompt_templates` | `() -> Vec<PromptTemplate>` | List all templates |
| `create_prompt_template` | `(name, content, description?) -> PromptTemplate` | Create template |
| `update_prompt_template` | `(id, name?, content?, description?) -> PromptTemplate` | Update template |
| `delete_prompt_template` | `(id: String) -> ()` | Delete template |

### URL Fetching
| Command | Signature | Description |
|---|---|---|
| `fetch_urls` | `(urls: Vec<String>) -> Vec<FetchResult>` | Fetch + parse URLs |
| `save_url_contexts` | `(message_id: String, contexts: Vec<FetchResult>) -> ()` | Persist URL contexts |
| `get_url_contexts` | `(message_id: String) -> Vec<UrlContext>` | Retrieve URL contexts |

### Pomodoro
| Command | Signature | Description |
|---|---|---|
| `get_pomodoro_state` | `() -> PomodoroState` | Get current timer state |
| `start_pomodoro` | `(work_minutes: u64, break_minutes: u64) -> ()` | Start timer |
| `stop_pomodoro` | `() -> ()` | Stop timer |

### Terminal
| Command | Signature | Description |
|---|---|---|
| `create_terminal_tab` | `() -> TerminalTab` | Spawn PTY process |
| `terminal_write` | `(tab_id: String, data: String) -> ()` | Write to PTY |
| `resize_terminal` | `(tab_id: String, rows: u16, cols: u16) -> ()` | Resize PTY |
| `close_terminal_tab` | `(tab_id: String) -> ()` | Kill process + clean up |
| `list_terminal_tabs` | `() -> Vec<TerminalTab>` | List active tabs |

## Testing

The backend has:
- **13 integration tests** in `db.rs` using `Database::new_in_memory()` — covering all tables, FK constraints, cascade deletes, slug uniqueness, and combined operations
- **8 unit tests** in `terminal.rs` — covering shell command construction (login/interactive flags, env vars) on Unix
- **9 unit tests** in `url_fetch.rs` — covering HTML parsing (title extraction, body text, tag stripping)

Run them with:
```bash
npm run test:rust
# or
cd src-tauri && cargo test
```

## Commands

```bash
# Run all Rust backend tests
npm run test:rust

# Run specific test
cd src-tauri && cargo test test_create_folder

# Start Tauri dev mode
npm run tauri:dev

# Production build
npm run tauri:build
```

## Important Gotchas

1. **Migration immutability.** Migration `001_init.sql` is run once on first launch. Do NOT modify it after release — create a new `002_*.sql` file and update `db.rs` to run it.

2. **WAL mode + foreign keys.** Both PRAGMAs must be set before running migration SQL. WAL mode allows concurrent reads without blocking. Foreign keys must be explicitly enabled (SQLite defaults to OFF).

3. **All errors are strings.** Every Tauri command returns `Result<T, String>`. The error string propagates to the frontend as a rejected Promise. There is no structured error type.

4. **AppState uses Mutex, not RwLock.** The database and terminal_tabs are wrapped in `std::sync::Mutex`. This means only one command can access the DB at a time, but the lock is held very briefly (just for the SQL query).

5. **Terminal tab management is manual.** Terminal tabs are stored in `AppState.terminal_tabs: Mutex<HashMap<String, TabEntry>>`. The background reader thread runs independently. Cleanup requires explicit `close_terminal_tab` to kill the process + join the thread.

6. **Pomodoro runs on a background thread.** The `PomodoroManager` spawns a thread that emits tick events. It continues running even if the frontend disconnects — state syncs via Tauri events.

7. **API keys are plaintext.** AI provider API keys are stored as-is in the `ai_providers.api_key` column. This is a deliberate choice for a single-user desktop app.

8. **In-memory database for testing.** `Database::new_in_memory()` creates an in-memory SQLite database with the same schema, enabling fast integration tests without file I/O.