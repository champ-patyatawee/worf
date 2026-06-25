---
name: notes
description: Obsidian-like linked Markdown notes system — wikilinks, backlinks, quick switcher, folders, tags, and pinning
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Notes** feature — an Obsidian-like linked Markdown notes system
- Create or modify frontend components in `src/components/notes/`
- Create or modify Rust backend commands in `src-tauri/src/commands/notes.rs` and `src-tauri/src/commands/folders.rs`
- Manage the database schema (`notes`, `note_links`, `folders` tables in `002_notes.sql` and `003_folders_position.sql`)
- Wire up wikilink parsing and resolution
- Maintain drag-and-drop reordering (folders and notes via the `⋮` drag handle), pinning, tags, folder organization, and multi-folder simultaneous expand
- Implement and maintain **multi-select** (Shift+click range select, Cmd/Ctrl+click toggle) and **batch move** (move multiple selected notes to a folder via action bar button, dialog, or drag)

## When to use me
Use when working on the Notes module — adding note-taking features, wiring up wikilinks, implementing the quick switcher, adding folder/tag organization, pin/favorite support, drag-and-drop reordering, or improving the note editor. Invoke this skill whenever files under `src/components/notes/`, `src-tauri/src/commands/notes.rs`, `src-tauri/src/commands/folders.rs`, `src-tauri/migrations/002_notes.sql`, `src-tauri/migrations/003_folders_position.sql`, or the `notes`, `note_links`, and `folders` database tables are involved.

## Architecture

### Current State (Fully Implemented)

The notes system is **fully built** and integrated. What exists:

| Area | Status |
|------|--------|
| Database migration `002_notes.sql` | ✅ Wired in `db.rs` |
| Database migration `003_folders_position.sql` | ✅ Wired in `db.rs` |
| Rust backend 12 commands in `notes.rs` | ✅ Registered in `lib.rs` |
| Rust backend 5 commands in `folders.rs` | ✅ Registered in `lib.rs` |
| Frontend components (10 files) | ✅ Built |
| Types in `src/components/notes/Types.ts` | ✅ Built |
| Route `/notes/:slug` in `App.tsx` | ✅ Wired |
| Notes icon in sidebar layout | ✅ Wired |

### File Tree

```
src/
├── components/notes/                # Frontend
│   ├── NoteEditor.tsx               # Markdown editor with Edit/Preview/Split, wikilink autocomplete, auto-save, pin/tags/backlinks
│   ├── NoteSidebar.tsx              # Folder tree + note list + pinned section + tags + search bar + drag-and-drop reorder (notes+f older)
│   ├── NoteToolbar.tsx              # Editor mode tabs (Edit/Preview/Split) + save status
│   ├── QuickSwitcher.tsx            # Cmd+P fuzzy search across all notes
│   ├── BacklinksPanel.tsx           # Shows which notes link to the current note
│   ├── WikilinkAutocomplete.tsx     # Dropdown for [[wikilink]] autocomplete
│   ├── noteStore.ts                 # Pub/sub state store (notes, folders, tags, search)
│   ├── noteHelpers.ts               # parseWikilinks(), generateSlug(), countWords(), preprocessWikilinks(), buildNotesLookup()
│   └── Types.ts                     # Note, Folder, NoteWithRelations, LinkInfo, SearchResult, EditorMode
│
├── pages/
│   └── Notes.tsx                    # Notes page route — sidebar + editor + quick switcher layout

src-tauri/
├── migrations/
│   ├── 001_init.sql                 # Original schema (folders table without position)
│   ├── 002_notes.sql                # Notes schema — notes + note_links tables
│   └── 003_folders_position.sql     # Adds position column to folders table for drag-drop reorder
│
├── src/
│   ├── db.rs                        # Runs all 3 migrations
│   ├── lib.rs                       # Registers all notes + folders commands
│   └── commands/
│       ├── mod.rs                   # pub mod notes; pub mod folders;
│   ├── notes.rs                 # 13 backend commands
│       └── folders.rs               # 5 backend commands (folder CRUD + reorder)
```

## Key Frontend Components

### `NoteSidebar.tsx`
Left sidebar for note organization (~900 lines):

- **Search bar** at top (triggers QuickSwitcher on focus or Cmd+P)
- **Pinned notes section** — displays notes where `pinned === 1` with pushpin icon
- **Folder tree** — folders sorted by `position ASC`. Each folder shows a chevron (expand/collapse). Clicking a folder:
  - **Expanding**: calls `loadAllNotes()` (not `loadNotesInFolder()`) — keeps ALL notes in memory so multiple folders can be expanded simultaneously. Sets `activeFolderId` state and `activeFolderIdRef.current`.
  - **Collapsing**: purely a local UI toggle — does NOT call `loadNotes()` or reset the note list. Only removes the folder from the `expandedFolders` set and clears `activeFolderIdRef`.
  - Multiple folders can be expanded at the same time.
- **Active folder indicator** — the active folder row gets a purple background (`var(--color-accent-subtle)`) and accent-colored text (`var(--color-accent-primary)`). The `activeFolderIdRef` preserves the active folder across sidebar refreshes.
- **Notes always appear UNDER folders** — never at the root tree level. Unfiled notes display in a special "Unfiled" pseudo-folder at the bottom of the folder tree.
- **Unfiled pseudo-folder** — shows notes with `folder_id === null` and `pinned !== 1`. Rendered with a muted `Folder` icon, a count badge, and its own expand/collapse toggle. Notes can be dragged out of it into real folders.
- **Drag-and-drop**:
  - Folders are dragged ONLY by the `⋮` (MoreHorizontal) button — not the entire row, preventing click interference
  - Notes are always `draggable` (they have no click handler to interfere with)
  - Drag a **note** onto a folder → moves note to that folder
  - Drag a **note** within the same folder → reorders notes by position
  - Drag a **folder** onto another folder → reorders the folder list
  - Uses `draggedItemRef` pattern (a `useRef<DragPayload>`) for reliable drag state, plus `dataTransfer` with `DragPayload` type discriminator (`{ type: "note" | "folder" }`)
- **Multi-select**:
  - `selectedNoteIds` is a `Set<string>` in React state for tracking selected notes
  - **Shift+click** on a note selects a contiguous range — clicks the first note, then Shift+click on another note selects all notes between them (inclusive). The range is computed from the visible note list for the currently expanded folder.
  - **Cmd/Ctrl+click** toggles an individual note in/out of the selection set without affecting the current selection
  - Clicking a note without Shift or Cmd/Ctrl **clears** the selection and navigates to the note (unless it is the active note — a second click on the active note deactivates it; if the active note is clicked while other notes are selected, selection is cleared and note is navigated to)
  - Visual feedback: selected `NoteItem` rows get a **highlight outline** (`outline: '2px solid var(--color-accent-primary)', outlineOffset: '-2px'`, combined with `backgroundColor: 'var(--color-accent-subtle)'`)
  - When one or more notes are selected, the `NoteItem` renders a small checkmark indicator in place of the usual `FileText` icon
- **Batch move UI**:
  - When `selectedNoteIds.size > 0`, the bottom action bar transforms to show:
    - A count badge (`"X selected"`)
    - A **"Move to folder..."** button that opens a folder picker dialog
  - **Folder picker dialog**: a modal overlay listing all folders (plus an "Unfiled" option). Clicking a folder:
    1. Calls `noteStore.moveNotes(Array.from(selectedNoteIds), folderId)` (or `null` for unfiled)
    2. Clears the selection
    3. Closes the dialog
    4. Triggers sidebar refresh
  - The dialog is dismissible via Escape key, an explicit "Cancel" button, or click-outside (on the overlay backdrop)
- **Drag-to-move with multi-select**:
  - When dragging a selected note, **all** selected notes move to the target folder, not just the dragged note
  - The `handleGlobalPointerUp` drop handler checks if the dragged note's ID is in `selectedNoteIds`. If so, it calls `noteStore.moveNotes(Array.from(selectedNoteIds), targetFolderId)` instead of `noteStore.moveNote(noteId, targetFolderId)`
  - This allows bulk moving via drag-and-drop without needing the action bar dialog
- **Context menu** (right-click on folder or click `⋮` button) — Rename (inline edit) or Delete
- **Inline folder creation** — bottom bar has a "New Folder" button that shows an inline input
- **Tags section** — displays all tags with counts; clicking a tag filters notes by that tag
- **Bottom action bar**:
  - Default state: "New Note" button + "New Folder" button
  - Multi-select state (when `selectedNoteIds.size > 0`): count badge + "Move to folder..." button. The "New Note"/"New Folder" buttons are hidden during multi-select.

### `NoteEditor.tsx`
Main Markdown editor (840 lines) — the most complex component:

- **Edit / Preview / Split modes** — toggled via `NoteToolbar`. Mode is persisted in `localStorage`.
- **Title input** — editable header with auto-save debounce
- **Markdown editing** — `<textarea>` for raw Markdown
- **Live preview** — uses `react-markdown` to render HTML in Preview/Split modes
- **Split mode** — side-by-side edit + preview panes
- **Auto-save** — 300ms debounce after typing stops. Separate timers for title and content.
- **Word count** — displayed in the editor footer. Computed both client-side and server-side.
- **Tags** — inline tag editor (comma-separated, shown as badges). Add/remove tags with autosave.
- **Pin/unpin** — toggle button (pin icon) in the editor header/status bar
- **Delete note** — Trash2 icon button in the editor status bar (bottom bar), with confirmation dialog
- **Wikilink rendering** — `[[target]]` and `[[target|display]]` are parsed and rendered as clickable links in preview mode
- **Wikilink autocomplete** — typing `[[` triggers a popup (WikilinkAutocomplete) filtering by title, with keyboard navigation
- **Backlinks panel** — collapsible section at the bottom showing notes that link to the current note
- **Quick switcher** — Cmd+P trigger dispatched to window event
- **Sidebar refresh** — calls `triggerSidebarRefresh()` after saves to keep the sidebar in sync

### `QuickSwitcher.tsx`
Cmd+P fuzzy search modal:

- Opens via keyboard shortcut (Cmd+P / Cmd+K) or search bar focus
- Debounced search (200ms) calling `noteStore.searchNotes`
- Keyboard navigation (arrow keys + Enter to navigate, Escape to close)
- Results show title + snippet + tag info
- "Create new note" fallback button
- Click-outside-to-close behavior

### `BacklinksPanel.tsx`
Collapsible panel showing notes that link to the current note:

- Uses `noteStore.state.activeNote.backlinks`
- Click a backlink note → navigates to it
- Collapsible `<details>` element
- Shows note title + link text snippet

### `WikilinkAutocomplete.tsx`
Dropdown popup when typing `[[` in the editor:

- Filters all notes by title substring (case-insensitive)
- Keyboard navigable (arrow keys, Enter to select)
- Shows up to 10 results
- Positioned inline at the cursor location
- Close on Escape or outside click

## Store Pattern (Pub/Sub)

### `noteStore.ts`
Follows the same pub/sub pattern as `chatSessionStore.ts`:

```typescript
// Imports from @tauri-apps/api/core (invoke)
// Types imported from ./Types

// Listeners set
type Listener = () => void;
const listeners = new Set<Listener>();

// Mutable state object
let state: NoteState = {
  notes: [],
  folders: [],
  activeNoteId: null,
  activeNote: null,       // NoteWithRelations | null
  loading: false,
  searchResults: [],
  tags: [],
  sidebarRefreshKey: 0,  // Incremented to trigger sidebar re-render
};

function emit() { listeners.forEach((l) => l()); }

export const noteStore = {
  subscribe,          // (listener) => unsubscribe function
  get state() {...},  // Returns current state
  // Actions (all async):
  loadNotes,
  loadNotesInFolder,
  loadAllNotes,
  loadNotesByTag,
  loadFolders,
  openNote,
  createNote,
  saveNote,
  deleteNote,
  moveNote,
  moveNotes,
  searchNotes,
  togglePinNote,
  createFolder,
  renameFolder,
  deleteFolder,
  reorderNotes,
  reorderFolders,
};

// Separate export for triggering sidebar refresh from editor
export function triggerSidebarRefresh() { ... }
```

### Cross-Component Refresh
When a note is saved, deleted, or moved, `triggerSidebarRefresh()` increments `sidebarRefreshKey`, causing `NoteSidebar` to re-fetch notes/folders. The editor also subscribes directly for active note sync.

## Folder System

### Folder Data Structure (Rust)
```rust
pub struct Folder {
    pub id: String,
    pub name: String,
    pub position: i32,         // Ordering index for drag-drop reorder
    pub created_at: String,
    pub updated_at: String,
}
```

### Folder Commands (in `folders.rs`)
| Command | Signature | Description |
|---|---|---|
| `list_folders` | `() -> Result<Vec<Folder>, String>` | Lists folders sorted by `position ASC, name ASC` |
| `create_folder` | `(name: String) -> Result<Folder, String>` | Creates folder with auto-incrementing position |
| `rename_folder` | `(id: String, name: String) -> Result<Folder, String>` | Renames folder |
| `delete_folder` | `(id: String) -> Result<(), String>` | Deletes folder (notes inside become unfiled — FK is ON DELETE SET NULL but notes must be handled explicitly) |
| `reorder_folders` | `(items: Vec<ReorderFolderItem>) -> Result<(), String>` | Batch-updates positions for all folders |

### Expand/Collapse Mechanics
- `expandedFolders` is a `Set<string>` in React state, managed via `setExpandedFolders()` — multiple folders can be expanded simultaneously.
- `activeFolderId` is React state used for rendering (visual highlight). `activeFolderIdRef` is a `useRef<string | null>` used wherever synchronous reads are needed (e.g., inside effects, "New Note" button click) to avoid React state batching delays.
- **When expanding a folder:**
  1. Folder ID is added to `expandedFolders` set
  2. `activeFolderId` is set to the folder ID
  3. `activeFolderIdRef.current` is set to the folder ID
  4. `loadAllNotes()` is called — this keeps ALL notes in memory so any combination of folders can display their notes without re-fetching
- **When collapsing a folder:**
  1. Folder ID is removed from `expandedFolders` set
  2. `activeFolderId` is set to `null`
  3. `activeFolderIdRef.current` is set to `null`
  4. `loadNotes()` is **NOT** called — the folder collapse is purely a local UI toggle. All notes remain in memory.
- **Sidebar refresh** (triggered by `sidebarRefreshKey`): the refresh effect checks `activeFolderIdRef.current`. If it is set, `loadAllNotes()` is called again; otherwise `loadNotes()` (root/unfiled notes) is called. This preserves the current view.

### Active Folder Visual Highlight
- The active folder's row gets:
  - Background: `var(--color-accent-subtle)` (purple tint)
  - Text color: `var(--color-accent-primary)` (accent color)
  - The `dragOverFolder` state also shares the same background when a note is being dragged over it
- The visual highlight is driven by `activeFolderId` React state (not the ref), so it updates reactively

### Multiple Simultaneous Expansion
- Because `loadAllNotes()` fetches all notes into `noteStore.state.notes`, any folder can display its notes by simply filtering `st.notes.filter(n => n.folder_id === folderId)`
- The `getFolderNotes(folderId)` helper does exactly this — no additional fetch needed
- This means you can expand Folder A, then click Folder B, and both show their notes simultaneously
- Performance note: for very large note collections, this approach stores everything in memory. Consider pagination if performance becomes an issue.

### Unfiled Pseudo-Folder
- Rendered at the bottom of the folder tree section (after all real folders)
- Shows notes with `folder_id === null` and `pinned !== 1`
- Visual: muted `Folder` icon (50% opacity), "Unfiled" label with count badge
- Has its OWN expand/collapse toggle via `unfiledExpanded` state (independent of `expandedFolders`)
- Notes can be dragged into real folders from this section
- Unlike real folders, clicking the Unfiled header toggles the local `unfiledExpanded` UI state — it does NOT set `activeFolderId` or call any data-loading function. All notes are already in memory.

### Position-Based Ordering
- Both `notes.position` and `folders.position` are `INTEGER` columns
- Notes sort by: `pinned DESC, position ASC, updated_at DESC`
- Folders sort by: `position ASC, name ASC`
- When a note is moved to a folder, it gets `MAX(position) + 1` in that folder
- Drag-and-drop reorder calls `reorder_notes` / `reorder_folders` with the full ordered list and new positions

## Wikilink System

### Parsing (`parse_wikilinks` in both Rust and TypeScript)
Pattern: `\[\[([^\]|]+)(?:\|([^\]]+))?\]\]`

Examples:
| Wikilink Syntax | Target | Display Text |
|---|---|---|
| `[[Meeting Notes]]` | `Meeting Notes` | `Meeting Notes` |
| `[[Meeting Notes\|June 1st]]` | `Meeting Notes` | `June 1st` |

### Resolution (`resolve_link_target` in Rust)
```sql
SELECT id FROM notes WHERE title = ?1 OR slug = ?1 LIMIT 1
```

### Link Table Maintenance (`update_note_links` in Rust)
Called on every `update_note` if content changed:
1. DELETE all links where `source_id` = current note
2. Re-parse content for `[[wikilinks]]`
3. For each resolved target, INSERT new `note_links` row
4. Self-links (source_id == target_id) are skipped

### Autocomplete (Frontend)
When user types `[[` in the textarea:
1. `WikilinkAutocomplete` component captures the partial text after `[[`
2. Filters `noteStore.state.notes` by title substring
3. Shows popover with matching note titles (up to 10)
4. On selection, inserts `[[selected title]]` or `[[slug|display text]]`

## Backend Commands Reference

### Notes Commands (12 commands in `notes.rs`)

| Command | Signature | Description |
|---|---|---|
| `create_note` | `(title: Option<String>, folder_id: Option<String>, tags: Option<String>) -> Result<Note, String>` | Creates a new note with auto-generated unique slug, assigns next position in folder |
| `get_note` | `(id_or_slug: String) -> Result<NoteWithRelations, String>` | Looks up by ID first, then slug. Returns note + backlinks + outbound_links |
| `update_note` | `(id: String, title: Option<String>, content: Option<String>, tags: Option<String>, frontmatter: Option<String>, pinned: Option<i32>) -> Result<Note, String>` | Updates note fields; rebuilds wikilinks if content changed; regenerates slug if title changed |
| `delete_note` | `(id: String) -> Result<(), String>` | Deletes note; `note_links` cascade-deletes via FK |
| `list_notes` | `(folder_id: Option<String>, tag: Option<String>, search: Option<String>) -> Result<Vec<Note>, String>` | Lists notes with optional filters, ordered by `pinned DESC, position ASC, updated_at DESC` |
| `list_root_notes` | `() -> Result<Vec<Note>, String>` | Lists notes with `folder_id IS NULL` (unfiled) |
| `list_notes_in_folder` | `(folder_id: String) -> Result<Vec<Note>, String>` | Lists all notes in a specific folder |
| `move_note` | `(id: String, folder_id: Option<String>) -> Result<Note, String>` | Moves a single note to folder (or unassigns). Assigns next available position in destination |
| `move_notes` | `(ids: Vec<String>, folder_id: Option<String>) -> Result<(), String>` | Batch-moves multiple notes to a folder. Calculates `COALESCE(MAX(position), -1) + 1` as base position, then assigns sequential positions (`base_pos + i`) to each note. Does NOT return individual notes — the frontend refreshes via `triggerSidebarRefresh()` |
| `reorder_notes` | `(items: Vec<ReorderItem>) -> Result<(), String>` | Batch-updates positions for a list of notes |
| `get_backlinks` | `(note_id: String) -> Result<Vec<LinkInfo>, String>` | Returns all notes linking TO the given note |
| `search_notes` | `(query: String) -> Result<Vec<SearchResult>, String>` | LIKE search on title + content, limited to 20 results |
| `toggle_pin_note` | `(id: String) -> Result<Note, String>` | Toggles `pinned` between 0 and 1 |

### Folder Commands (5 commands in `folders.rs`)

| Command | Signature | Description |
|---|---|---|
| `list_folders` | `() -> Result<Vec<Folder>, String>` | Lists folders sorted by `position ASC, name ASC` |
| `create_folder` | `(name: String) -> Result<Folder, String>` | Creates folder with auto-incrementing `position` |
| `rename_folder` | `(id: String, name: String) -> Result<Folder, String>` | Renames folder |
| `delete_folder` | `(id: String) -> Result<(), String>` | Deletes folder. Notes inside become unfiled. |
| `reorder_folders` | `(items: Vec<ReorderFolderItem>) -> Result<(), String>` | Batch-updates positions for all folders |

## Database Schema

### `notes` table (from `002_notes.sql`)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID, generated server-side (Rust `uuid::Uuid::new_v4()`) |
| `title` | TEXT | `'Untitled'` | |
| `slug` | TEXT NOT NULL UNIQUE | `''` | Auto-generated from title, hyphenated, uniqueness enforced with `-1`, `-2` suffix |
| `content` | TEXT | `''` | Raw Markdown content |
| `folder_id` | TEXT | — | FK → `folders(id)` ON DELETE SET NULL |
| `tags` | TEXT | `''` | Comma-separated: `"tag1,tag2"` |
| `frontmatter` | TEXT | `'{}'` | JSON blob for YAML frontmatter data |
| `pinned` | INTEGER | `0` | `1` = pinned to top of lists |
| `position` | INTEGER | `0` | Ordering index for drag-drop reorder |
| `word_count` | INTEGER | `0` | Computed on each `update_note` |
| `created_at` | TEXT | `datetime('now')` | |
| `updated_at` | TEXT | `datetime('now')` | |

### `note_links` table (from `002_notes.sql`)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `source_id` | TEXT NOT NULL | — | FK → `notes(id)` ON DELETE CASCADE |
| `target_id` | TEXT NOT NULL | — | FK → `notes(id)` ON DELETE CASCADE |
| `link_text` | TEXT | `''` | Display text from `[[wikilink\|display]]` |
| `created_at` | TEXT | `datetime('now')` | |

### `folders` table (augmented by `003_folders_position.sql`)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `name` | TEXT | — | |
| `position` | INTEGER | `0` | Added by migration 003 |
| `created_at` | TEXT | | |
| `updated_at` | TEXT | | |

### Indexes
- `idx_notes_folder` on `notes(folder_id)`
- `idx_notes_slug` on `notes(slug)`
- `idx_notes_tags` on `notes(tags)`
- `idx_notes_pinned` on `notes(pinned)`
- `idx_note_links_source` on `note_links(source_id)`
- `idx_note_links_target` on `note_links(target_id)`
- `idx_folders_position` on `folders(position)` (from migration 003)

## Data Flows

### Save Note Flow
```
User types in NoteEditor
       │
       ▼
Debounce 300ms (separate timers for title and content)
       │
       ▼
noteStore.saveNote(id, { content, title, tags, ... })
       │
       ▼
invoke('update_note', { id, content, title, tags, frontmatter, pinned })
       │
       ▼
Rust: update_note()
  ├── Fetch current note
  ├── Apply changes (title, slug, content, tags, frontmatter, pinned)
  ├── Recompute word_count
  ├── IF content changed → update_note_links()
  │     ├── DELETE FROM note_links WHERE source_id = ?
  │     ├── Parse [[wikilinks]] from new content
  │     └── INSERT resolved links into note_links
  └── Return updated Note
       │
       ▼
noteStore → emit() + triggerSidebarRefresh() → React re-renders
```

### Load Note Flow
```
User clicks note in sidebar / navigates to /notes/:slug
       │
       ▼
noteStore.openNote(idOrSlug)
       │
       ▼
invoke('get_note', { idOrSlug })
       │
       ▼
Rust: get_note()
  ├── Lookup by ID or slug
  ├── fetch_backlinks(id)  → "what links TO this note?"
  ├── fetch_outbound_links(id) → "what does THIS note link to?"
  └── Return NoteWithRelations { note, backlinks, outbound_links }
       │
       ▼
noteStore → emit() → NoteEditor + BacklinksPanel re-render
```

### Move Note Between Folders (Drag-and-Drop)
```
User drags a note onto a folder in NoteSidebar
       │
       ▼
handleGlobalPointerUp(e)
  ├── Find drop target folder via elementFromPoint + [data-folder-id]
  ├── If target folder changed:
  │     ├── IF dragged note is in selectedNoteIds:
  │     │     └── noteStore.moveNotes(Array.from(selectedNoteIds), targetFolderId)
  │     │           └── invoke('move_notes', { ids: [...], folderId })
  │     │                 └── Rust: assign sequential positions (base_pos + i) per note
  │     ├── ELSE (single note, not selected):
  │     │     └── noteStore.moveNote(id, folderId)
  │     │           └── invoke('move_note', { id, folderId })
  │     │                 └── Rust: assign new position = MAX(position) + 1
  │     ├── triggerSidebarRefresh()
  │     └── clearSelection()
  └── If same folder (reorder):
        ├── Compute reordered list based on drop position
        └── noteStore.reorderNotes(items)
              └── invoke('reorder_notes', { items })
```

### Batch Move via Action Bar (Dialog)
```
User selects multiple notes → "Move to folder..." button appears
       │
       ▼
Click "Move to folder..." → Folder picker dialog opens
       │
       ▼
User clicks a folder (or "Unfiled") in the dialog
       │
       ▼
noteStore.moveNotes(Array.from(selectedNoteIds), folderId)
  ├── invoke('move_notes', { ids: [...], folderId })
  │     └── Rust: UPDATE notes SET folder_id, position, updated_at WHERE id IN (...)
  ├── triggerSidebarRefresh()
  ├── clearSelection()
  └── closeDialog()
```

## TypeScript Types (in `src/components/notes/Types.ts`)

```typescript
export interface Note {
  id: string;
  title: string;
  slug: string;
  content: string;
  folder_id: string | null;
  tags: string;
  frontmatter: string;
  pinned: number;
  position: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteWithRelations {
  note: Note;
  backlinks: LinkInfo[];
  outbound_links: LinkInfo[];
}

export interface LinkInfo {
  note_id: string;
  note_title: string;
  note_slug: string;
  link_text: string;
}

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  snippet: string;
  tags: string;
}

export interface Folder {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type EditorMode = "edit" | "preview" | "split";
```

## Rust Data Structures

```rust
// /Users/champp/Champ/worf/src-tauri/src/commands/notes.rs

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub tags: String,
    pub frontmatter: String,        // JSON blob
    pub pinned: i32,                 // 0 or 1
    pub position: i32,               // ordering index
    pub word_count: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub position: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteWithRelations {
    pub note: Note,
    pub backlinks: Vec<LinkInfo>,
    pub outbound_links: Vec<LinkInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LinkInfo {
    pub note_id: String,
    pub note_title: String,
    pub note_slug: String,
    pub link_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub snippet: String,            // First 100 chars of content
    pub tags: String,
}
```

### Folder data structure (in `folders.rs`)
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderFolderItem {
    pub id: String,
    pub position: i32,
}
```

## IPC Pattern

```typescript
import { invoke } from '@tauri-apps/api/core';

// Create note
const note = await invoke<Note>('create_note', {
  title: 'My Note',
  folderId: null,
  tags: 'work,ideas',
});

// Get note with relations
const noteWithRelations = await invoke<NoteWithRelations>('get_note', {
  idOrSlug: 'my-note',
});

// Search
const results = await invoke<SearchResult[]>('search_notes', {
  query: 'meeting',
});

// Reorder notes
await invoke('reorder_notes', {
  items: [{ id: 'uuid-1', position: 0 }, { id: 'uuid-2', position: 1 }],
});

// Reorder folders
await invoke('reorder_folders', {
  items: [{ id: 'uuid-1', position: 0 }, { id: 'uuid-2', position: 1 }],
});

// Move note to folder
const moved = await invoke<Note>('move_note', {
  id: 'note-uuid',
  folderId: 'folder-uuid',
});

// Batch move multiple notes to folder
await invoke('move_notes', {
  ids: ['note-uuid-1', 'note-uuid-2', 'note-uuid-3'],
  folderId: 'folder-uuid',
});

// Batch move multiple notes to unfiled
await invoke('move_notes', {
  ids: ['note-uuid-1', 'note-uuid-2'],
  folderId: null,
});
```

## Important Gotchas

1. **Notes always appear UNDER folders in the sidebar**: Unfiled notes (`folder_id IS NULL`) are shown in a special "Unfiled" pseudo-folder at the bottom of the folder tree. Notes never render at the root level of the sidebar.

2. **Migration 003 adds `position` to folders**: The original `001_init.sql` creates the `folders` table without a `position` column. Migration `003_folders_position.sql` adds it with `ALTER TABLE`. Both migrations are wired in `db.rs`.

3. **`db.rs` runs all 3 migrations**: Both `new()` and `new_in_memory()` execute `001_init.sql`, `002_notes.sql`, and `003_folders_position.sql` in sequence. If adding a new migration, append a new `.sql` file and add another `execute_batch` call.

4. **`folders.rs` uses the `folders` table**: The old `pages` table from the legacy TipTap system is unused. The new notes system uses the `notes` and `note_links` tables.

5. **Wikilink resolution order**: `resolve_link_target` checks `title` first, then `slug`. If a note has title "meeting-notes" and another has slug "meeting-notes", the title match wins.

6. **Self-links are skipped**: `update_note_links` explicitly skips inserting links where `source_id == target_id`.

7. **Unresolved wikilinks are valid**: If `[[Some Note]]` doesn't match any existing note, the link is simply not inserted into `note_links`. The frontend renders unresolved links with dashed underline styling (see `preprocessWikilinks` in `noteHelpers.ts`).

8. **Slug uniqueness enforcement**: `unique_slug()` appends `-1`, `-2`, etc. if the base slug already exists. Empty slugs fall back to `"untitled"`.

9. **Tags are comma-separated strings**: Stored as a plain TEXT column. Tag filtering uses `LIKE '%tag%'` which can match substrings. For strict matching, consider splitting into a join table.

10. **Frontmatter is a JSON blob**: Stored as a JSON string in TEXT. Default is `"{}"`.

11. **Pinned notes float to top**: All list queries sort by `pinned DESC, position ASC, updated_at DESC`. Pinned notes always appear first.

12. **Word count is server-computed on save**: `count_words()` runs on `update_note`. The frontend also computes and displays word count in real-time during editing.

13. **Auto-save uses 300ms debounce**: The `NoteEditor` has separate debounce timers for title (300ms) and content (300ms). On unmount, pending saves are flushed immediately.

14. **Position is assigned on create and move**: `create_note` assigns `MAX(position) + 1` in the target folder. `move_note` does the same. Drag-and-drop reorder calls `reorder_notes` / `reorder_folders` with explicit positions.

15. **Drag-and-drop uses `DragPayload` type discriminator**: The `NoteSidebar` uses a `draggedItemRef` to distinguish between dragging a note and dragging a folder. This is necessary because native HTML drag-and-drop doesn't provide a reliable way to distinguish drop types purely from the drop event.

16. **Sidebar refresh uses `sidebarRefreshKey`**: The `noteStore` has a `sidebarRefreshKey` counter. `triggerSidebarRefresh()` increments it, causing `NoteSidebar`'s effect to re-fetch notes/folders while preserving the active folder via `activeFolderIdRef`.

17. **`activeFolderIdRef` pattern**: Because `NoteSidebar`'s refresh effect depends on `sidebarRefreshKey` (not the state itself), a ref is used to avoid stale closures. The ref is kept in sync with the state in `handleFolderClick`.

18. **All IDs are UUIDs**: Generated server-side with `uuid::Uuid::new_v4()` in Rust commands. The frontend does not generate IDs.

19. **`list_notes` with no filters loads ALL notes**: For performance on large datasets, consider adding pagination. Currently `loadAllNotes()` calls `list_notes` without filters and loads every note into memory.

20. **The `pages` table from `001_init.sql` is legacy**: Do NOT use it for new code. The old TipTap-based system used it, but it's been abandoned.

21. **`activeFolderIdRef` vs `activeFolderId` (ref vs state)**: `activeFolderIdRef` is a `useRef<string | null>` used for synchronous reads inside effects and event handlers (e.g., "New Note" button, sidebar refresh effect). `activeFolderId` is React state used for reactive rendering (visual highlight). The ref is kept in sync with the state in `handleFolderClick`. **Always use the ref, not the state, when you need to read the active folder inside a callback or effect** — React state batching can cause stale reads.

22. **`loadAllNotes()` keeps everything in memory**: When expanding a folder, `loadAllNotes()` is called instead of `loadNotesInFolder()`. This means ALL notes are loaded into `noteStore.state.notes`. Expand/collapse is purely a visual filter. Multiple folders can be expanded at once because the data is already available. The tradeoff is memory — for very large datasets, this may need optimization.

23. **Collapsing a folder is purely a local UI toggle**: When you collapse a folder, no data-loading call is made. The folder is just removed from the `expandedFolders` set and `activeFolderIdRef` is cleared. All notes remain in memory. This is intentional — it allows instant expand/collapse and preserves multi-folder expand state.

24. **Folder drag handle is the `⋮` button only**: Folders have `draggable` set on only the `MoreHorizontal` (⋮) button, not the entire row. This prevents interference with the `onClick` handler (which expands/collapses the folder). Notes, by contrast, are always `draggable` on the entire row because they have no click handler.

25. **`draggedItemRef` pattern for reliable drag state**: The `NoteSidebar` maintains a `useRef<DragPayload | null>` called `draggedItemRef`. This is set on `dragStart` and cleared on `dragEnd`. Drop handlers read from this ref rather than parsing `e.dataTransfer.getData()`, which can be unreliable across browser tab boundaries and drag events. Always set `draggedItemRef.current` in `onDragStart` and clear it in `onDragEnd`.

26. **`expandedFolders` is a `Set<string>` in React state**: Because `Set` is mutable, always create a new `Set` when updating: `setExpandedFolders(prev => { const next = new Set(prev); next.add(folderId); return next; })`. This ensures React detects the state change.

27. **Unfiled pseudo-folder has its own expand state**: The `unfiledExpanded` state is a simple `boolean` (not part of `expandedFolders`). Clicking the Unfiled header toggles this boolean. It does NOT interact with `activeFolderId`, `activeFolderIdRef`, or any data-loading function.

28. **Delete note button is in the editor status bar**: The `Trash2` icon is in the bottom status bar of `NoteEditor.tsx`, next to the pin and creation-date elements. It calls `handleDelete()` which shows a `confirm()` dialog, then calls `noteStore.deleteNote()` and navigates away to `/notes`.

29. **Shift+click range selection is computed from the visible rendered note list**: When the user Shift+clicks, the range is determined by the order of `NoteItem` elements currently in the DOM for the active folder (`document.querySelectorAll('[data-note-id]')`). The "anchor" note (the last note that was clicked without Shift) is tracked in a `rangeAnchorRef`. If no anchor is set and the user Shift+clicks, only the clicked note is selected.

30. **Multi-select clears on sidebar refresh**: When `sidebarRefreshKey` changes and notes are re-fetched, `selectedNoteIds` is cleared. This prevents stale IDs from persisting after notes have been moved, deleted, or renamed. Selection also clears when the active folder changes.

31. **Bottom action bar has two display modes**: The bar conditionally renders either the default ("New Note" + "New Folder") or multi-select mode ("X selected" count + "Move to folder..." button). When `selectedNoteIds.size > 0`, the default buttons are hidden. The multi-select buttons are hidden when `selectedNoteIds.size === 0`.

32. **Drag-to-move uses `selectedNoteIds` not individual selection**: If the user has selected 3 notes and drags one of them, ALL 3 notes are moved. This is checked in the drop handler: if `selectedNoteIds.has(draggedNoteId)`, batch-move all selected notes; if not, move only the dragged note. This means dragging an unselected note while other notes are selected moves ONLY the dragged note.

33. **`move_notes` does NOT return individual Note objects**: Unlike `move_note` (which returns the updated `Note`), `move_notes` returns `Result<()>`. The frontend must rely on `triggerSidebarRefresh()` to re-fetch the full note list after a batch move. This is intentional — returning many Note objects could be wasteful for large batches.

34. **Folder dialog is a simple overlay, not a command palette**: The "Move to folder..." dialog renders a list of all folders (from `noteStore.state.folders`) plus an "Unfiled" option (represented as `folderId: null`). It does NOT support search/filtering. Each folder row shows its name and has an accent-colored hover effect. Clicking the row triggers the move and closes the dialog.

## Design Patterns

### Pub/Sub Note Store
The `noteStore.ts` follows the same pattern as `chatSessionStore.ts`:
- Mutable state object with getter
- `Set<Listener>` for subscribers
- `emit()` calls all listeners
- All actions are async and call `emit()` after mutation
- No Zustand, Redux, or other state libraries

### Auto-Save Debounce
- 300ms debounce for both title and content in `NoteEditor`
- Separate timer refs: `titleTimerRef` and `saveTimerRef`
- Flush on unmount: clears timers and saves immediately if dirty

### Drag-and-Drop Pattern
- Uses native HTML Drag and Drop API (not a library)
- `DragPayload` discriminated union type: `{ type: "note"; id; folderId; position } | { type: "folder"; id; position }`
- `draggedItemRef` (`useRef<DragPayload>`) to reliably track what's being dragged across drag start/end/drop events
- Folders: `draggable` is set on the `⋮` (MoreHorizontal) button only, NOT the row — prevents click interference with expand/collapse
- Notes: `draggable` is set on the entire row (they have no click handler)
- Position-based ordering: `reorderNotes` / `reorderFolders` batch-update positions

### Folder Expand/Collapse Pattern
- `expandedFolders` is a `Set<string>` in React state for multiple simultaneous expansion
- `activeFolderIdRef` (`useRef`) for synchronous reads in effects/callbacks (avoids stale closure due to React batching)
- `activeFolderId` (React state) for reactive visual styling
- **Expand**: add to `expandedFolders` + set `activeFolderId` + set `activeFolderIdRef` + call `loadAllNotes()`
- **Collapse**: remove from `expandedFolders` + clear `activeFolderId` + clear `activeFolderIdRef` — no data load
- Sidebar refresh re-fetches data based on `activeFolderIdRef.current`, preserving the current view

### Cross-Component Refresh
- `triggerSidebarRefresh()` increments `sidebarRefreshKey` in store
- `NoteSidebar` subscribes to `sidebarRefreshKey` changes and re-fetches notes/folders appropriately
- Active folder is preserved via ref

### Multi-Select Pattern
Multi-select follows a simple pattern without external libraries:
- **State**: `selectedNoteIds` is a `Set<string>` in React state initialized to `new Set()`
- **Range anchor**: `rangeAnchorRef` is a `useRef<string | null>` that tracks the last note clicked without Shift (the anchor for Shift+click range selection)
- **Shift+click**: From a `handleNoteClick` variant that receives the click event, detect `e.shiftKey`. Find the anchor from `rangeAnchorRef`, then compute all note elements between anchor and clicked note in DOM order. Add all of them to `selectedNoteIds`.
- **Cmd/Ctrl+click**: Detect `e.metaKey || e.ctrlKey`. Toggle the clicked note in `selectedNoteIds` (if present, remove it; if absent, add it). Do NOT set the range anchor.
- **Plain click**: Clear `selectedNoteIds`, set `rangeAnchorRef` to the clicked note's ID, and navigate to the note (unless it's the active note — second click deactivates).
- **Selection clearing**: `clearSelection()` is called after batch move, sidebar refresh, folder change, or any single-note navigation.

### Batch Move Pattern
- **Store action**: `noteStore.moveNotes(ids: string[], folderId: string | null)` calls `invoke('move_notes', { ids, folderId })`, then updates `state.notes` by mapping each moved note's `folder_id` and a new placeholder position, then calls `triggerSidebarRefresh()`.
- **Backend command**: `move_notes` in Rust takes `ids: Vec<String>` and `folder_id: Option<String>`. It computes `base_pos = MAX(position) + 1` in the target folder, then assigns `base_pos + i` to each note in order. This ensures sequential positioning without gaps.
- **Drag integration**: The drop handler checks `selectedNoteIds.has(draggedNoteId)` — if true, batch-moves all selected; if false, single-moves only the dragged note. This prevents accidentally moving unselected notes when dragging alongside a selection.

## Test Commands

```bash
# Run all frontend tests
npm test

# Run Rust tests (includes any notes.rs tests)
npm run test:rust

# Run E2E tests
npm run test:e2e

# Run specific frontend test file
npx vitest src/test/notes.spec.ts

# Run specific Rust test
cargo test -p worf test_notes

# Build and run the app for manual testing
npm run tauri dev
```