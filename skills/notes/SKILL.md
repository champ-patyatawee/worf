---
name: notes
description: Rich text editor with TipTap/novel, AI generate/edit/complete, and folder hierarchy
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Notes** feature — a rich text editor using TipTap via the `novel` library
- Create or modify editor components in `src/components/notes/`
- Wire up AI integration for content generation, editing, and autocomplete
- Manage folder hierarchy and page CRUD through Rust backend commands
- Write and run tests for editor extensions, slash commands, and note logic

## When to use me
Use when working on the Notes module — adding editor features, modifying TipTap extensions, changing AI prompt flows, adding folder/page management, or fixing the note editor's save/load behavior. Invoke this skill whenever files under `src/components/notes/`, `src/services/aiService.ts`, or the `folders`/`pages` Rust commands are involved.

## Architecture

### Frontend Components

```
src/components/notes/
├── NoteEditor.tsx          # Main editor — TipTap/novel, AI generate/edit, auto-save
├── NoteSidebar.tsx         # Folder tree + page list sidebar with CRUD
├── extensions.ts           # TipTap extension config (slash commands, placeholder, etc.)
├── slash-command.tsx       # Slash command menu (/gen for AI, / for headings/lists/etc.)
├── NodeSelector.tsx        # Block type selector: H1-H3, bullet list, numbered list, blockquote, code
├── TextButtons.tsx         # Bold / italic / underline / strikethrough toolbar
├── GhostText.tsx           # AI autocomplete ghost text overlay
├── GenerateInput.tsx       # AI generation popup (user types a prompt)
├── AIEditInput.tsx         # AI edit instruction input (select text → give instruction)
└── useAICompletion.ts      # Hook for AI autocomplete with debounce
```

### Key Files & Roles

#### `NoteEditor.tsx`
The main editor component. Uses `novel`'s `EditorRoot`, `EditorContent`, `EditorBubble`, and `EditorCommand` primitives. Key behaviors:
- Loads page content by slug or ID via `invoke("get_page")`
- Saves content to the backend with a **300ms debounce** via `useDebouncedCallback`
- Stores content as **TipTap JSON** in the `content` column
- Title changes auto-generate a new slug (navigates to new URL)
- AI generate/edit triggered via custom events (`ai-generate-trigger`)
- Editor instance accessed via a ref (`editorRef`) shared through `EditorRefSetter`

#### `extensions.ts`
Configures all TipTap extensions:
- Default extensions from novel (history, typography, placeholder, etc.)
- Slash command extension
- Image resize, drag handle, placeholder

#### `slash-command.tsx`
The `/` command menu with:
- **/gen** — AI content generation (triggers `GenerateInput` popup)
- **Heading 1/2/3** — Block-level headings
- **Bullet List / Numbered List** — List blocks
- **Blockquote / Code Block** — Special block types
- Items use `EditorCommandItem` with `onCommand` callbacks

#### `NodeSelector.tsx`
Floating toolbar for block type selection (appears after selecting text). Shows when the `EditorBubble` is open. Lets users toggle between heading levels and list types.

#### `TextButtons.tsx`
Bold, italic, underline, and strikethrough toggle buttons. Used inside the `EditorBubble` toolbar.

#### AI Components
- **`GhostText.tsx`** — Renders inline ghost text for autocomplete suggestions. Uses `useAICompletion` hook which calls `aiComplete()` from `aiService.ts`.
- **`GenerateInput.tsx`** — A popup input that appears at cursor position when `/gen` is triggered. Calls `aiGenerate()` on submit.
- **`AIEditInput.tsx`** — An input that replaces the bubble toolbar when "AI" is clicked. Captures the selected text range and calls `aiEdit()`.
- **`useAICompletion.ts`** — Custom hook that debounces editor text changes and fetches AI completions via `aiService.aiComplete()`.

#### `NoteSidebar.tsx`
Left sidebar showing:
- Folder tree (created via `create_folder` / `list_folders`)
- Pages within each folder (`list_pages_in_folder`)
- Root pages (folder_id IS NULL / `list_pages`)
- Create/rename/delete folders and pages
- Import/export mechanism: `triggerNoteSidebarRefresh()` is exported for other components to call

### Backend Commands

#### `commands/folders.rs`
| Command | Signature | Description |
|---|---|---|
| `create_folder` | `(name: String) → Folder` | Creates a new folder |
| `list_folders` | `() → Vec<Folder>` | Lists all folders |
| `rename_folder` | `(id: String, name: String) → Folder` | Renames an existing folder |
| `delete_folder` | `(id: String) → ()` | Deletes folder (pages get folder_id = NULL via ON DELETE SET NULL) |

#### `commands/pages.rs`
| Command | Signature | Description |
|---|---|---|
| `create_page` | `(title: String, folder_id: Option<String>) → Page` | Creates page with auto-generated slug from title |
| `get_page` | `(id: String) → Page` | Gets a single page by ID |
| `update_page` | `(id: String, title: Option<String>, content: Option<String>) → Page` | Updates title (re-generates slug) and/or content |
| `delete_page` | `(id: String) → ()` | Deletes a page |
| `list_pages` | `() → Vec<Page>` | Lists root pages (folder_id IS NULL) |
| `list_pages_in_folder` | `(folder_id: String) → Vec<Page>` | Lists pages in a specific folder |

### AI Service (`src/services/aiService.ts`)

Three AI modes, each with its own pair of system prompts (agent + skill):

| Mode | Function | Prompt Structure | Output Format |
|---|---|---|---|
| **Generate** | `aiGenerate(prompt, context?)` | "You are Note Generate..." + skill rules | Markdown → HTML via `marked` |
| **Edit** | `aiEdit(text, instruction)` | "You are Note Edit..." + skill rules | Markdown → HTML via `marked` |
| **Complete** | `aiComplete(textBefore, textAfter)` | "You are Note Complete..." + skill rules | Plain text (no markdown conversion) |

Architecture:
1. `getNoteProvider()` reads the `note_ai_provider_id` setting from the SQLite `settings` table
2. Resolves the provider ID against `ai_providers` table to get API URL, key, and model
3. `callLLM()` appends `/chat/completions` to the API URL and sends a POST with `Authorization: Bearer {api_key}`
4. Uses OpenAI-compatible API format (works with any OpenAI-compatible provider)
5. Generate and Edit modes convert markdown → HTML using the `marked` library before returning to TipTap

### Slug Generation

- Page slugs: `title.toLowerCase().replace(/ /g, "-")` — happens server-side in `create_page` and `update_page`
- Slugs must be UNIQUE (enforced by SQLite UNIQUE index on `pages.slug`)
- When `update_page` changes the title, slug is regenerated
- NoteEditor navigates to the new slug URL when it detects a change

### Database Schema

```sql
folders (id TEXT PK, name TEXT, created_at, updated_at)
pages   (id TEXT PK, title TEXT, slug TEXT UNIQUE, content TEXT, folder_id TEXT FK→folders ON DELETE SET NULL, created_at, updated_at)
```

Indexes: `idx_pages_folder (folder_id)`, `idx_pages_slug (slug)`

### Types (`src/types/index.ts`)

```typescript
interface Folder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}
```

## Data Flow

```
User types/edits → TipTap editor → editor.getJSON() → debounced save (300ms)
  → invoke("update_page", { id, title, content }) → SQLite UPDATE
  → Backend returns updated Page with slug → Frontend navigates if slug changed

User opens page → URL has slug → NoteEditor.loadPage(slug)
  → invoke("get_page", { id: slug }) || search all pages by slug
  → JSON.parse(content) → editor.commands.setContent(parsed)
```

## Design Patterns

### State Management
The Notes module does **not** use the pub/sub store pattern. Instead:
- `NoteEditor` manages page/title/save state via local `useState` + `useRef`
- `NoteSidebar` fetches folders/pages directly via `invoke()` on mount and on refresh trigger
- Cross-component coordination via `triggerNoteSidebarRefresh()` — a module-level counter that both components import

### AI Auto-Complete Flow
```
User types in editor → useAICompletion hook (debounced) → 
  aiComplete(beforeCursor, afterCursor) → callLLM() → 
  response parsed → GhostText renders inline overlay
```

## Commands

```bash
# Run notes-related tests
npx vitest run src/test/notes.spec.ts

# Run extension and slash-command tests
npx vitest run src/test/extensions.spec.ts src/test/slash-commands.spec.ts

# Run all frontend tests
npm test
```

## Important Gotchas

1. **AI provider must be configured first.** Notes AI features require a configured AI provider in Settings > Note Settings. If none is configured, `callLLM()` throws: "No AI provider configured for notes."

2. **TipTap content is stored as JSON strings** in the `content` column, not HTML. The default empty content is `{"type":"doc","content":[{"type":"paragraph","content":[]}]}`. On load, if content is `"{}"`, it's replaced with the default TipTap doc structure.

3. **Slug uniqueness can cause issues.** If two pages have the same title, the second `create_page` will fail due to the UNIQUE constraint on `slug`. The frontend currently doesn't handle this gracefully.

4. **Editor re-render on page change.** The editor component does NOT re-mount when navigating between pages. Instead, it uses `editor.commands.setContent(parsed)` inside a `useEffect` keyed on `currentPage.id`. This means editor state (undo history, cursor position) persists across page navigations.

5. **MutationObserver for drag handle.** Novel's `GlobalDragHandle` sets `contenteditable="true"` on the drag handle element, which can cause issues. A `MutationObserver` in `NoteEditor` fixes this by resetting it to `"false"`.

6. **`marked` conversion.** AI generate/edit outputs are converted from markdown to HTML via `marked.parse()`. This HTML is then inserted via `editor.chain().focus().insertContent(content).run()`. If the HTML has `<p>` tags, they may need stripping for inline operations.

7. **Folder delete cascades to NULL.** Deleting a folder sets `pages.folder_id = NULL` (ON DELETE SET NULL). Pages are NOT deleted — they become root/unfiled pages.