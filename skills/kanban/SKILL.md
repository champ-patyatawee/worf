---
name: kanban
description: Drag-and-drop Kanban boards with task management, columns, priorities, and position-based ordering
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Kanban** feature — draggable task boards with column-based workflow
- Create or modify board/task components in `src/components/kanban/`
- Manage board and task CRUD through Rust backend commands
- Handle drag-and-drop interactions with a custom pointer-event system
- Wire up priority badges, position re-ordering, and column transitions

## When to use me
Use when working on the Kanban module — adding board features, modifying drag-and-drop behavior, changing task CRUD, working on column layout or priority system. Invoke this skill whenever files under `src/components/kanban/`, `src/pages/Kanban.tsx`, or the `boards`/`tasks` Rust commands are involved.

## Architecture

### Frontend Components

```
src/components/kanban/
├── KanbanBoard.tsx         # Main board — 3 columns, task CRUD, routing
├── KanbanSidebar.tsx       # Board list sidebar with create/delete
├── KanbanColumn.tsx        # Single column view with data-kanban-column attribute
├── KanbanTaskCard.tsx      # Draggable task card with priority badge
└── KanbanTaskModal.tsx     # Create/edit task modal dialog
```

### Key Files & Roles

#### `KanbanBoard.tsx`
The main board component rendered at route `/kanban/:boardId`. Key behaviors:
- Loads board + tasks via `invoke("get_board", { idOrSlug: boardId })` — supports lookup by ID or slug
- 3 fixed columns: **To Do** (`todo`), **In Progress** (`in_progress`), **Done** (`done`)
- Task CRUD: create via modal, edit via modal prefilled, delete with confirmation, move between columns
- Local state management: `tasks` array updated optimistically on move, re-fetched on error
- Horizontal scroll with custom wheel handler (deltaY → scrollLeft for horizontal scrolling)

#### `KanbanSidebar.tsx`
Lists all boards with create/delete controls. Each board links to `/kanban/:boardId`. Uses `list_boards` and `create_board`/`delete_board` commands.

#### `KanbanColumn.tsx`
Renders a single column with:
- `data-kanban-column` attribute set to the status value — used by `KanbanTaskCard` for drop detection
- Iterates tasks and renders `KanbanTaskCard` for each
- "Add Task" button at the bottom

#### `KanbanTaskCard.tsx`
The draggable task card. Uses a **custom pointer-event-based drag system** (not @dnd-kit). Features:
- **Drag**: `onPointerDown` creates a ghost clone of the card, tracks offset, moves ghost globally via `pointermove`
- **Drop**: `onPointerUp` uses `document.elementFromPoint()` to find the column under the cursor via `data-kanban-column` attribute
- **Priority badge**: displayed as a small uppercase pill — `low`=gray, `medium`=yellow, `high`=red
- **Move buttons**: arrow buttons to move between columns (left for previous column, right for next)
- **Optimistic updates**: state updates immediately, backend call in background (re-fetches on error)

#### `KanbanTaskModal.tsx`
Modal dialog for creating and editing tasks. Fields:
- **Title** (text input, required)
- **Description** (textarea, optional)
- **Priority** (select: low/medium/high — note: "urgent" is NOT in the current type definition)
- **Status** (select: todo/in_progress/done)

#### `src/pages/Kanban.tsx`
Route-level page component combining `<KanbanSidebar>` and `<KanbanBoard>`. Layout: sidebar on the left, board fills remaining space.

### Backend Commands

#### `commands/boards.rs`
| Command | Signature | Description |
|---|---|---|
| `create_board` | `(name: String, description: Option<String>) → Board` | Creates board with auto-generated slug |
| `list_boards` | `() → Vec<Board>` | Lists all boards |
| `get_board` | `(id_or_slug: String) → BoardWithTasks` | Gets board by ID or slug, includes all tasks |
| `delete_board` | `(id: String) → ()` | Deletes board (cascades to tasks via ON DELETE CASCADE) |

#### `commands/tasks.rs`
| Command | Signature | Description |
|---|---|---|
| `create_task` | `(title, description?, priority?, status?, board_id) → Task` | Creates task at end of column (max position + 1) |
| `update_task` | `(id, title?, description?, priority?, status?) → Task` | Updates individual fields |
| `move_task` | `(id, status, position?) → Task` | Changes status + optional position, re-orders column |
| `delete_task` | `(id) → ()` | Deletes task |

### Types (`src/types/index.ts`)

```typescript
interface Board {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardWithTasks extends Board {
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  position: number;
  board_id: string;
  created_at: string;
  updated_at: string;
}

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";
```

### Database Schema

```sql
boards (id TEXT PK, name TEXT, slug TEXT UNIQUE, description TEXT, created_at, updated_at)
tasks  (id TEXT PK, title TEXT, description TEXT, priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'todo', position INTEGER DEFAULT 0,
        board_id TEXT FK→boards ON DELETE CASCADE, created_at, updated_at)
```

Indexes: `idx_tasks_board (board_id)`, `idx_tasks_status (status)`

## Drag-and-Drop Architecture

The kanban uses a **custom drag-and-drop implementation** (not @dnd-kit):

```
Pointer down on card:
  1. Record task ID + offset in module-level `dragState`
  2. Clone card element → fixed-position ghost with rotation + shadow
  3. Dim original card (opacity: 0.3)

Pointer move (global listener):
  1. Move ghost element to follow cursor

Pointer up (global listener):
  1. Restore original card opacity
  2. Use document.elementFromPoint(x, y) to find element under cursor
  3. Walk up DOM to find [data-kanban-column] attribute
  4. Call onMove(taskId, targetStatus) → invokes move_task command
  5. Clean up ghost + drag state
```

Global listeners are registered in a `useEffect` on mount and cleaned up on unmount. The `dragState` is a module-level variable (not React state), so it persists across component instances.

## Position Re-ordering Logic

- **Create**: New task gets `position = MAX(position) + 1` in its board
- **Move (`move_task`)**: On status change, all tasks in the target column are re-indexed sequentially (0, 1, 2, ...) based on their current sort order
- **Display**: Tasks are sorted by `position ASC` within each column

## Data Flow

```
Open board → URL has boardId → KanbanBoard loads →
  invoke("get_board", { idOrSlug: boardId }) → returns BoardWithTasks →
  setTasks(data.tasks) → filter by status → pass to KanbanColumn → render KanbanTaskCards

Drag card to new column → pointer up handler finds [data-kanban-column] →
  onMove(taskId, "in_progress") → optimistic update → 
  invoke("move_task", { id, status, position: null }) → 
  backend re-indexes all tasks in target column → done
```

## Commands

```bash
# Run kanban-related tests
npx vitest run src/test/kanban.spec.ts src/test/board-tasks.spec.ts

# Run all frontend tests
npm test
```

## Important Gotchas

1. **Not using @dnd-kit.** The kanban implements a custom pointer-event-based drag system. Do NOT try to introduce @dnd-kit — the current approach works with ghost clones and `document.elementFromPoint()`.

2. **Priority "urgent" is NOT in types.** The `TaskPriority` type is `"low" | "medium" | "high"` — there is no "urgent" priority. If you see "urgent" referenced anywhere, it's stale documentation.

3. **Board lookup is dual.** `get_board` accepts either a UUID `id` OR a `slug`. This is handled in the Rust command by trying lookup by ID first, then by slug. The frontend passes `boardId` from the URL, which may be either.

4. **Drag ghost cleanup is critical.** The `handlePointerUp` and cleanup functions must remove the ghost element from the DOM and reset `dragState`. If a component unmounts while dragging, the `useEffect` cleanup calls `cleanupDrag()`.

5. **No server-side position on move.** When moving between columns, the frontend does NOT send a specific position — `position` is sent as `null`. The backend keeps the existing position and re-indexes. This means the card always goes to the same relative position in the new column.

6. **Optimistic updates are risky.** `handleMoveTask` updates local state immediately, then calls the backend. If the backend fails (e.g., the task doesn't exist), it re-fetches the entire board. This can cause flashing if the backend is slow.

7. **Slug is auto-generated from name.** Board slugs follow the same pattern as pages: `name.toLowerCase().replace(/ /g, "-")`. Enforced UNIQUE in SQLite.