---
name: testing
description: Testing strategies — Vitest frontend, Cargo Rust tests, and WDIO E2E tests
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Write and run **frontend tests** with Vitest + Testing Library (jsdom)
- Write and run **Rust backend tests** with `cargo test` (unit + in-memory integration)
- Write and run **E2E tests** with WDIO (WebDriverIO) via Tauri's webdriver plugin
- Maintain test setup, configuration, and naming conventions
- Ensure cross-suite test coverage for all modules

## When to use me
Use when writing new tests, debugging test failures, adding test infrastructure, or running the test suites. Invoke this skill whenever test files are involved (`src/test/*.spec.*`, `src-tauri/src/commands/*.rs` tests, `e2e-tests/`), or when the user asks to "run tests", "add tests", or "fix a test".

## Test Suites Overview

| Suite | Runner | Location | Files | Purpose |
|---|---|---|---|---|
| Frontend unit | Vitest | `src/test/*.spec.{ts,tsx}` | 13 files | Component and logic tests |
| Rust backend | Cargo | `src-tauri/src/**/*.rs` | 3 files with tests | Integration and unit tests |
| E2E | WDIO | `e2e-tests/specs/*.e2e.js` | 2 files | Full-app browser tests |

## Frontend Tests (Vitest)

### Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.spec.{ts,tsx}"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    server: {
      deps: {
        inline: ["novel", "react-tweet"],
      },
    },
  },
});
```

Key config details:
- **jsdom environment** — simulates a browser DOM for component tests
- **globals: true** — enables `describe`, `it`, `expect` without imports
- **setup file** — imports `@testing-library/jest-dom` for DOM matchers (toBeInTheDocument, etc.)
- **CSS modules** — `non-scoped` strategy to avoid CSS class name hashing issues
- **Deps inlining** — `novel` and `react-tweet` must be inlined for jsdom compatibility

### Test Setup (`src/test/setup.ts`)

```typescript
import "@testing-library/jest-dom";
```

Currently minimal — adds custom jest-dom matchers. Can be extended with global mocks for Tauri `invoke()`, `listen()`, etc. when needed.

### Test File Convention

| Pattern | Content | Example |
|---|---|---|
| `*.spec.ts` | Logic/utility/store tests | `terminal.spec.ts`, `kanban.spec.ts` |
| `*.spec.tsx` | Component tests with JSX rendering | `terminal-settings.spec.tsx`, `message-list.spec.tsx` |

### Test File Inventory (13 files)

| File | What it Tests |
|---|---|
| `terminal.spec.ts` | Terminal store logic (tab management, settings, I/O handlers) |
| `terminal-themes.spec.ts` | Theme data integrity and lookup functions |
| `terminal-settings.spec.tsx` | Terminal settings UI component rendering |
| `slash-commands.spec.ts` | Slash command configuration and suggestion items |
| `extensions.spec.ts` | TipTap extension setup |
| `kanban.spec.ts` | Kanban board/task store logic |
| `board-tasks.spec.ts` | Combined board + task operations |
| `notes.spec.ts` | Notes store/logic tests |
| `dashboard.spec.ts` | Dashboard widget rendering and data |
| `url-reader.spec.ts` | URL detection and content extraction utilities |
| `message-list.spec.tsx` | Chat message list component rendering |
| `select.spec.tsx` | Select dropdown component tests |

### Mocks Strategy

The frontend tests mock Tauri IPC calls (`invoke`, `listen`, `emit`) using Vitest's `vi.mock()`:

```typescript
import { invoke } from "@tauri-apps/api/core";
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
```

This allows tests to control what `invoke` returns without needing an actual Tauri runtime.

## Rust Backend Tests (Cargo)

### Test Types

#### 1. Integration Tests (`db.rs`)

13 tests using `Database::new_in_memory()` — creates an in-memory SQLite database with the full schema. Tests cover:

| Category | Tests |
|---|---|
| Folder CRUD | `test_create_folder`, `test_rename_folder` |
| Page CRUD | `test_create_and_list_pages`, `test_create_page_in_folder`, `test_page_slug_uniqueness`, `test_page_title_update_changes_slug`, `test_list_pages_in_folder`, `test_page_without_folder` |
| Board CRUD | `test_create_and_list_boards`, `test_board_slug_uniqueness` |
| Task CRUD | `test_create_and_list_tasks`, `test_create_board_with_three_tasks` |
| FK constraints | `test_foreign_key_cascade_delete_board`, `test_delete_folder_sets_page_folder_null` |
| Settings | `test_settings_key_value` |

Pattern:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Database {
        Database::new_in_memory().expect("Failed to create in-memory database")
    }

    #[test]
    fn test_create_and_list_folders() {
        let db = setup();
        // ... insert and query using db.conn
    }
}
```

#### 2. Command Unit Tests (`terminal.rs`)

8 tests for shell command building (all marked `#[cfg(unix)]`):

| Test | What it Verifies |
|---|---|
| `test_terminal_tab_struct` | Tab struct creation |
| `test_build_shell_command_does_not_panic` | Builder doesn't crash |
| `test_build_shell_command_has_interactive_flag` | `-i` flag present |
| `test_build_shell_command_has_term_env` | `TERM=xterm-256color` |
| `test_build_shell_command_fallback_no_login` | No `-l` in fallback | 
| `test_build_shell_command_fallback_has_term_env` | TERM env in fallback |
| `test_build_shell_command_has_colorterm_env` | `COLORTERM=truecolor` |
| `test_build_shell_command_has_term_program_env` | `TERM_PROGRAM=xterm.js` |
| `test_build_shell_command_fallback_has_colorterm_env` | COLORTERM in fallback |
| `test_build_shell_command_fallback_has_term_program_env` | TERM_PROGRAM in fallback |

#### 3. URL Fetch Tests (`url_fetch.rs`)

9 tests for HTML parsing (title extraction, body text, tag stripping, edge cases).

### Running Rust Tests

```bash
# All Rust tests
cd src-tauri && cargo test

# Specific test
cd src-tauri && cargo test test_create_folder

# Filter tests by name pattern
cd src-tauri && cargo test test_page

# Show output for debugging
cd src-tauri && cargo test -- --nocapture
```

## E2E Tests (WDIO)

### Configuration (`e2e-tests/wdio.conf.js`)

WDIO is configured to connect to Tauri's webdriver server (started with `--features webdriver`). Tests are plain JavaScript.

### Test Files

| File | Tests |
|---|---|
| `e2e-tests/specs/terminal.e2e.js` | Terminal E2E: verify terminal renders, tabs can be created/closed |
| `e2e-tests/specs/notes.e2e.js` | Notes E2E: verify editor loads, pages can be created/edited |

### Running E2E Tests

```bash
# Start Tauri with webdriver support
npm run tauri:dev:webdriver

# In another terminal, run E2E tests
npm run test:e2e
```

## Running Tests

```bash
# Frontend unit tests
npm test

# Frontend tests in watch mode
npm run test:watch

# Frontend tests with UI
npx vitest --ui

# Rust backend tests
npm run test:rust

# E2E tests
npm run test:e2e

# Run specific frontend test file
npx vitest run src/test/terminal.spec.ts

# Run all three suites
npm test && npm run test:rust && npm run test:e2e
```

## Writing Tests

### Frontend Test Guidelines

1. **Name test files** following the convention: `src/test/<module>.spec.ts` for logic, `<module>.spec.tsx` for components
2. **Mock Tauri IPC** using `vi.mock("@tauri-apps/api/core")`
3. **Use Testing Library** queries for component tests (`screen.getByText`, `screen.getByRole`)
4. **Group tests** with `describe` blocks by module/feature
5. **Keep tests focused** — one assertion per test for logic tests, multiple for component rendering

### Rust Test Guidelines

1. **Integration tests** use `Database::new_in_memory()` to get a clean DB per test
2. **Unit tests** test pure functions (shell command building, HTML parsing) without DB
3. **Use `#[cfg(test)]`** to exclude test modules from release builds
4. **Use `#[cfg(unix)]`** for platform-specific terminal tests
5. **Name tests descriptively** — `test_create_board_with_three_tasks` rather than `test_board_1`

## Important Gotchas

1. **Tauri `invoke()` must be mocked.** Frontend tests run in jsdom without Tauri runtime. Every test file that uses `invoke()` must mock `@tauri-apps/api/core`. Missing mocks cause runtime errors.

2. **Novel/TipTap requires dependency inlining.** The `novel` library must be inlined in vite config (`server.deps.inline`) for jsdom compatibility. Without this, tests will fail with import errors.

3. **Rust tests use in-memory SQLite.** `Database::new_in_memory()` initializes a fresh schema each time. Tests run in parallel by default — each test gets its own connection, so there's no contention.

4. **E2E tests require webdriver feature.** The Tauri app must be started with `--features webdriver` to enable the webdriver server. Without this flag, E2E tests cannot connect.

5. **CSS modules strategy matters.** The `non-scoped` strategy in vitest config prevents CSS class name mangling, making tests more predictable. Change this carefully.

6. **Test files accept both `.ts` and `.tsx`.** The include pattern `src/**/*.spec.{ts,tsx}` catches both. Use `.tsx` only when JSX rendering is needed.

7. **No coverage thresholds are configured.** There are no minimum coverage requirements set in `vitest.config.ts`. Coverage can be added when needed.