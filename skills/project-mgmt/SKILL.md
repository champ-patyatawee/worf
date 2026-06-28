---
name: project-mgmt
description: Project management system — Calendar view, due dates, task scheduling, Scrum (sprints), and OKRs (quarterly goals) built on Kanban
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Project Management** feature layer on top of Kanban boards
- Manage the **Calendar page** at `/calendar` — month grid with task pills, month navigation, today button
- Add **due date** support to tasks: picker in modal, badge on cards, filtering/sorting by date
- Provide `list_tasks_by_date_range` for querying tasks across date windows
- Manage **Scrum sprints** — time-boxed iterations with sprint planning, active sprint tracking, backlog management
- Manage **OKRs (Objectives & Key Results)** — quarterly goals with key results, auto-computed progress tracking, and dashboard widgets

## When to use me
Use when working on project-management features — adding or modifying the Calendar page, wiring due-date fields on tasks, creating date-based queries, modifying the task form or card to show due dates, or working with Scrum sprints or OKRs. Invoke this skill whenever files under `src/pages/Calendar.tsx`, `src/components/calendar/`, `src/components/kanban/SprintBar.tsx`, `src/components/okr/`, `src/pages/OKRs.tsx`, `src/pages/OKRDetail.tsx`, or the `due_date`/`sprint_id` fields in `tasks.rs`, `sprints.rs`, `okr.rs`, or `types/index.ts` are involved.

## Architecture

### File Tree

```
src/
├── pages/
│   ├── Calendar.tsx                 # Calendar page — month grid, navigation, today button, task pills
│   ├── OKRs.tsx                     # OKR list page — objectives grouped by quarter
│   └── OKRDetail.tsx                # Single objective detail with KRs and progress
├── components/
│   ├── calendar/
│   │   ├── CalendarHeader.tsx       # Month/year display + prev/next/today buttons
│   │   ├── MonthGrid.tsx            # 7-column month grid with day cells, today highlighting
│   │   ├── CalendarTaskPill.tsx     # Priority-colored task badge inside a day cell
│   │   └── index.ts                 # Re-exports all calendar components
│   ├── okr/
│   │   ├── OKRCard.tsx              # Objective card with progress bar
│   │   ├── KRRow.tsx                # Key result row with editable progress/confidence
│   │   ├── OKRCreateModal.tsx       # Create objective modal
│   │   ├── KRCreateModal.tsx        # Add key result modal
│   │   ├── QuarterSelector.tsx      # Switch between quarters
│   │   ├── CheckInModal.tsx         # Weekly check-in dialog
│   │   ├── OKRWidget.tsx            # Dashboard widget for OKR overview
│   │   └── index.ts                 # Re-exports all OKR components
│   ├── kanban/
│   │   ├── KanbanTaskModal.tsx      # Now has due_date field + sprint_id selector
│   │   ├── KanbanTaskCard.tsx       # Now shows due date badge (overdue/today/future)
│   │   ├── KanbanBoard.tsx          # Updated with sprint filtering + backlog mode
│   │   ├── SprintBar.tsx            # Sprint selector + status bar above board
│   │   ├── SprintCreateModal.tsx    # Modal to create a new sprint
│   │   └── SprintCompleteDialog.tsx # Confirmation dialog for completing a sprint
│   └── ...
│
src-tauri/
├── migrations/
│   ├── 004_dates.sql                # Adds due_date TEXT column to tasks table + index
│   ├── 005_sprints.sql              # Creates sprints table + sprint_id FK on tasks
│   └── 006_okr.sql                  # Creates okr_objectives, okr_key_results, board_objectives tables
├── src/
│   └── commands/
│       ├── tasks.rs                 # Updated: due_date + sprint_id in Task struct, create/update/list
│       ├── boards.rs                # Updated: get_board query includes due_date + sprint_id in task rows
│       ├── sprints.rs               # NEW: 7 sprint commands (create, list, start, complete, etc.)
│       └── okr.rs                   # NEW: 10 objective + key result commands
```

### What Exists vs What Needs Building

| Artifact | Status | Notes |
|---|---|---|
| `004_dates.sql` | ✅ Built | `ALTER TABLE tasks ADD COLUMN due_date TEXT; CREATE INDEX idx_tasks_due_date` |
| `Task.due_date` in Rust | ✅ Built | `due_date: Option<String>` on the Task struct |
| `create_task` accepts `due_date` | ❌ Needs impl | Currently does NOT accept `due_date` param |
| `update_task` accepts `due_date` | ❌ Needs impl | Currently does NOT accept `due_date` param |
| `list_tasks_by_date_range` command | ❌ Needs impl | New command needed for Calendar page |
| `get_board` returns `due_date` | ❌ Needs impl | SQL query doesn't select `due_date` column |
| `Task.due_date` in TypeScript types | ❌ Needs impl | `src/types/index.ts` Task interface missing `due_date` |
| `Calendar.tsx` page | ❌ Needs impl | Route at `/calendar` |
| `src/components/calendar/` components | ❌ Needs impl | CalendarHeader, MonthGrid, CalendarTaskPill |
| Due date picker in `KanbanTaskModal.tsx` | ❌ Needs impl | Date input field |
| Due date badge in `KanbanTaskCard.tsx` | ❌ Needs impl | Priority-colored badge with overdue state |
| Calendar navigation in sidebar | ❌ Needs impl | Link in `IconSidebar.tsx` tabs |
| Route in `App.tsx` | ❌ Needs impl | `/calendar` route |

### Key Frontend Components

#### `Calendar.tsx` (page at `/calendar`)
The main Calendar page. Key behaviors:
- **Month grid** — renders a 7-column grid (Sun–Sat) for the current month
- **Navigation** — prev/next month buttons + "Today" button to jump back to current month
- **Month/year header** — e.g. "June 2026"
- **Today highlighting** — current day cell has accent-colored border/background
- **Task loading** — on mount and month change, calls `invoke('list_tasks_by_date_range', { startDate, endDate })`
- **Click-through** — clicking a task pill navigates to `kanban/${task.board_id}` to open that task's board
- **Empty state** — months with no dated tasks show a subtle "No tasks with due dates this month" message

#### `CalendarHeader.tsx`
- Displays the current month and year, e.g. "June 2026"
- **Prev button** (`<`) — goes to previous month
- **Next button** (`>`) — goes to next month
- **Today button** — resets view to current month, even if already on current month
- Props: `{ currentDate: Date; onPrev: () => void; onNext: () => void; onToday: () => void }`

#### `MonthGrid.tsx`
- Renders a 7-column CSS grid (Sunday–Saturday column headers)
- Computes leading blank cells (days before the 1st of the month)
- Each day cell shows the day number + a list of `CalendarTaskPill` components
- Current day gets a special accent-colored highlight (`outline` or `backgroundColor`)
- Tasks are passed as a lookup map: `Record<string, Task[]>` keyed by "YYYY-MM-DD"
- Props: `{ year: number; month: number; today: string; tasksByDate: Record<string, Task[]>; onTaskClick: (task: Task) => void }`

#### `CalendarTaskPill.tsx`
- Small, rounded pill showing the task title (truncated to ~15-20 chars)
- Color-coded by priority: **high**=red, **medium**=amber, **low**=gray
- Clickable — calls `onTaskClick(task)` which navigates to the Kanban board
- Shows at most ~3-4 pills per cell (overflow badge)
- Props: `{ task: Task; onClick: (task: Task) => void }`
- Inline styles only (no CSS modules/tailwind classes for dynamic colors)

#### `KanbanTaskModal.tsx` — due_date addition
Add a date picker input below the Priority/Status row:
```tsx
<div>
  <label className="block text-sm font-bold mb-1">Due Date</label>
  <input
    type="date"
    value={dueDate}
    onChange={(e) => setDueDate(e.target.value)}
    className="w-full px-3 py-2 text-sm border-2 rounded-[var(--radius-md)]"
  />
</div>
```
- `dueDate` state is a `string` (YYYY-MM-DD format) — initialized from `task.due_date` when editing, or `''` when creating
- The `onSave` callback signature changes to: `(d: { title: string; description: string; priority: string; status: string; due_date: string }) => void`

#### `KanbanTaskCard.tsx` — due_date badge
After the priority badge, conditionally render a due date badge:
- **No due date**: no badge shown
- **Future due date**: normal badge, e.g. `"Jun 30"`
- **Due today**: amber badge with `"Today"` label
- **Overdue** (due_date < today): red badge with `"Overdue"` or `"Jun 28"` in red
- Badge styling: small text, rounded, inline with priority badge
- Comparison logic:
  ```typescript
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const isOverdue = task.due_date && task.due_date < today;
  const isToday = task.due_date === today;
  ```

### Sprint Frontend Components

#### `SprintBar.tsx`
Sprint management bar displayed above the Kanban board. Key behaviors:
- **Sprint selector dropdown** — lists all sprints for the current board, highlights active sprint
- **Status indicator** — shows current sprint phase (Planning / Active / Complete)
- **"No Sprint" (Backlog) mode** — option to view tasks without a sprint assignment
- **Create Sprint button** — opens `SprintCreateModal`
- **Complete Sprint button** — opens `SprintCompleteDialog` (only when sprint is active)
- **Sprint dates display** — e.g. "Jul 1 – Jul 14"
- **Goal preview** — expandable section showing sprint goal
- Props: `{ boardId: string; activeSprint: Sprint | null; sprints: Sprint[]; onSprintChange: (sprintId: string | null) => void; onRefresh: () => void }`

#### `SprintCreateModal.tsx`
Modal dialog for creating a new sprint. Fields:
- **Name** — text input (required)
- **Goal** — textarea (optional sprint objective)
- **Start Date** / **End Date** — date inputs (required, validated start < end)
- On save: calls `invoke('create_sprint', { boardId, name, goal, startDate, endDate })`
- Props: `{ boardId: string; isOpen: boolean; onClose: () => void; onCreated: () => void }`

#### `SprintCompleteDialog.tsx`
Confirmation dialog when completing an active sprint:
- Shows sprint name, date range, and task counts:
  - Completed tasks (status = `done`)
  - Unfinished tasks (moved to backlog)
- **Confirm button** — calls `invoke('complete_sprint', { sprintId })`, which moves all non-done tasks to `sprint_id = null`
- **Cancel button** — closes dialog without action
- Props: `{ sprint: Sprint; taskCounts: { done: number; unfinished: number }; isOpen: boolean; onClose: () => void; onCompleted: () => void }`

#### `KanbanBoard.tsx` — Sprint additions
The board component now includes:
- **Sprint filtering** — displays tasks filtered by selected sprint (or backlog tasks when `sprint_id IS NULL`)
- **SprintBar** rendered above columns
- **Task creation** defaults `sprint_id` to the currently selected sprint
- **Backlog mode** has a distinct visual indicator (e.g., "Backlog" label above columns)

#### `KanbanTaskModal.tsx` — Sprint additions
The task modal now includes a sprint selector:
```tsx
<select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
  <option value="">No Sprint (Backlog)</option>
  {sprints.map(s => (
    <option key={s.id} value={s.id}>{s.name}</option>
  ))}
</select>
```
- `sprintId` state initialized from `task.sprint_id` or current active sprint for new tasks
- `onSave` payload now includes `sprint_id: string | null`

### OKR Frontend Components

#### `OKRCard.tsx`
Objective card displayed on the OKR list page. Key behaviors:
- **Title** — objective name (bold, clickable → navigates to `/okr/{id}`)
- **Description** — truncated to 2 lines with "..." overflow
- **Progress bar** — visual bar filled to `objective.progress` percent, color-coded:
  - `< 25%`: red
  - `25-75%`: amber
  - `> 75%`: green
- **KR count** — e.g. "3 key results"
- **Quarter badge** — e.g. "2026-Q2"
- **Linked boards** — small icons/badges showing linked boards
- Props: `{ objective: ObjectiveWithKRs; onClick: (id: string) => void }`

#### `KRRow.tsx`
Individual key result row inside the objective detail page:
- **Title** — KR description (editable inline on click)
- **Progress** — editable current value field with min/max validation against target
- **Confidence** — 1-10 dropdown (not a percentage)
- **Unit** — display unit (%, $, #, etc.) next to current/target values
- **In-line progress bar** — shows `current_value / target_value` as a mini bar
- Auto-saves on blur with `invoke('update_key_result', { id, currentValue, confidence })`
- Props: `{ keyResult: KeyResult; onUpdated: () => void }`

#### `OKRCreateModal.tsx`
Modal for creating a new objective:
- **Title** — text input (required)
- **Description** — textarea (optional)
- **Quarter** — auto-set to current quarter, switchable via `QuarterSelector`
- On save: calls `invoke('create_objective', { title, description, quarter, year })`
- Props: `{ isOpen: boolean; onClose: () => void; onCreated: () => void }`

#### `KRCreateModal.tsx`
Modal for adding a key result to an objective:
- **Title** — text input (required)
- **Initial Value** — number input (default 0)
- **Target Value** — number input (required, must be > initial)
- **Unit** — text input, e.g. "%", "$", "users" (optional)
- **Confidence** — 1-10 slider/dropdown (default 5)
- On save: calls `invoke('create_key_result', { objectiveId, title, initialValue, targetValue, unit, confidence })`
- Props: `{ objectiveId: string; isOpen: boolean; onClose: () => void; onCreated: () => void }`

#### `QuarterSelector.tsx`
Quarter switching component for the OKR list:
- Displays current quarter badge with prev/next arrows
- Quarter format: `"YYYY-QN"` (e.g., `"2026-Q2"`)
- Quick-jump to current quarter button
- Props: `{ current: string; onChange: (quarter: string) => void }`
- Logic:
  ```typescript
  function parseQuarter(q: string): { year: number; quarter: number } {
    const [y, qn] = q.split('-Q');
    return { year: parseInt(y), quarter: parseInt(qn) };
  }
  function formatQuarter(year: number, quarter: number): string {
    return `${year}-Q${quarter}`;
  }
  function nextQuarter(q: string): string { /* increment, wrap Q4→Q1 + year++ */ }
  function prevQuarter(q: string): string { /* decrement, wrap Q1→Q4 + year-- */ }
  ```

#### `CheckInModal.tsx`
Weekly check-in dialog for updating KR progress:
- Lists all KRs for the objective with current progress
- Each KR has an input to update `current_value` and `confidence`
- Optional **comment** field for notes on progress
- Batch save: loops through KRs calling `invoke('update_key_result')` for each
- Props: `{ objective: ObjectiveWithKRs; isOpen: boolean; onClose: () => void; onCheckedIn: () => void }`

#### `OKRWidget.tsx`
Dashboard widget showing OKR overview (displayed on the main dashboard):
- **Quarter selector** — small version to pick quarter
- **Objective list** — top 3-5 objectives with mini progress bars
- **Overall progress** — average of all objective progresses for the quarter
- **Click-through** — clicking an objective navigates to `/okr/{id}`; "View all" navigates to `/okrs`
- Compact layout suitable for sidebar or dashboard panel
- Props: `{ objectives: ObjectiveWithKRs[]; loading: boolean }`

### Backend Commands

#### `commands/tasks.rs` — Existing (to update)

| Command | Signature | Status | Description |
|---|---|---|---|
| `create_task` | `(title, description?, priority?, status?, board_id, due_date?)` → `Task` | ❌ Add `due_date` | Creates task, include `due_date` in INSERT |
| `update_task` | `(id, title?, description?, priority?, status?, due_date?)` → `Task` | ❌ Add `due_date` | Updates task, include `due_date` in SET |
| `list_tasks_by_date_range` | `(start_date, end_date, board_id?)` → `Vec<Task>` | ❌ New | Lists tasks with due_date in [start_date, end_date], optionally filtered by board_id |
| `move_task` | `(id, status, position?)` → `Task` | ✅ Exists | No changes needed |
| `delete_task` | `(id)` → `()` | ✅ Exists | No changes needed |

#### New Command: `list_tasks_by_date_range`

```rust
#[tauri::command]
pub fn list_tasks_by_date_range(
    state: State<AppState>,
    start_date: String,
    end_date: String,
    board_id: Option<String>,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let query = match board_id {
        Some(_) => "SELECT id, title, description, priority, status, position, board_id, due_date, created_at, updated_at
                     FROM tasks WHERE due_date IS NOT NULL AND due_date >= ?1 AND due_date <= ?2 AND board_id = ?3
                     ORDER BY due_date ASC, position ASC",
        None => "SELECT id, title, description, priority, status, position, board_id, due_date, created_at, updated_at
                 FROM tasks WHERE due_date IS NOT NULL AND due_date >= ?1 AND due_date <= ?2
                 ORDER BY due_date ASC, position ASC",
    };

    let mut stmt = db.conn.prepare(query).map_err(|e| e.to_string())?;

    // Bind params and collect
    let tasks = match &board_id {
        Some(bid) => stmt.query_map(rusqlite::params![start_date, end_date, bid], map_task_row)?,
        None => stmt.query_map(rusqlite::params![start_date, end_date], map_task_row)?,
    };

    tasks.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
```

#### `create_task` — Updated Signature

Add `due_date: Option<String>` parameter:

```rust
#[tauri::command]
pub fn create_task(
    state: State<AppState>,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    status: Option<String>,
    board_id: String,
    due_date: Option<String>,
) -> Result<Task, String> {
    // ... existing logic ...
    // INSERT now includes due_date:
    db.conn.execute(
        "INSERT INTO tasks (id, title, description, priority, status, position, board_id, due_date, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, title, description, task_priority, task_status, position, board_id, due_date, now, now],
    )?;
    // Return Task with due_date included
}
```

#### `update_task` — Updated Signature

Add `due_date: Option<String>` parameter:

```rust
#[tauri::command]
pub fn update_task(
    state: State<AppState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    priority: Option<String>,
    status: Option<String>,
    due_date: Option<String>,
) -> Result<Task, String> {
    // ... existing title/description/priority/status updates ...
    // Add due_date update block:
    if let Some(ref d) = due_date {
        db.conn.execute(
            "UPDATE tasks SET due_date = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![d, now, id],
        )?;
    }
    // Re-fetch Task includes due_date:
    // SELECT id, title, description, priority, status, position, board_id, due_date, created_at, updated_at
}
```

#### `get_board` in `boards.rs` — Updated Query

The `get_board` command's task query must include `due_date`:

```rust
let mut stmt = db.conn.prepare(
    "SELECT id, title, description, priority, status, position, board_id, due_date, created_at, updated_at
     FROM tasks WHERE board_id = ?1 ORDER BY position ASC",
)?;
```

### Backend Commands — Sprints (`commands/sprints.rs`)

| Command | Signature | Description |
|---|---|---|
| `create_sprint` | `(board_id, name, goal?, start_date, end_date)` → `Sprint` | Creates a new sprint in Planning status |
| `list_sprints` | `(board_id)` → `Vec<Sprint>` | Lists all sprints for a board, ordered by start_date DESC |
| `get_active_sprint` | `(board_id)` → `Option<Sprint>` | Returns the currently active sprint for a board, if any |
| `start_sprint` | `(sprint_id)` → `Sprint` | Transitions sprint from Planning → Active. Ensures only one active sprint per board |
| `complete_sprint` | `(sprint_id)` → `Sprint` | Transitions sprint from Active → Complete. Moves unfinished tasks (status ≠ done) to `sprint_id = NULL` (backlog) |
| `update_sprint` | `(id, name?, goal?, start_date?, end_date?)` → `Sprint` | Updates sprint metadata (only editable when in Planning status) |
| `delete_sprint` | `(id)` → `()` | Deletes sprint. Sets all associated tasks' `sprint_id` to NULL |

#### Sprint Lifecycle States
```
Planning → (start_sprint) → Active → (complete_sprint) → Complete
                                                              ↓
                                             Unfinished tasks → backlog (sprint_id = NULL)
```

#### Rust `Sprint` struct:
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Sprint {
    pub id: String,
    pub board_id: String,
    pub name: String,
    pub goal: Option<String>,
    pub start_date: String,    // "YYYY-MM-DD"
    pub end_date: String,      // "YYYY-MM-DD"
    pub status: String,        // "planning" | "active" | "complete"
    pub created_at: String,
    pub updated_at: String,
}
```

### Backend Commands — OKRs (`commands/okr.rs`)

#### Objective Commands (5)

| Command | Signature | Description |
|---|---|---|
| `create_objective` | `(title, description?, quarter, year)` → `Objective` | Creates a new quarterly objective |
| `list_objectives` | `(quarter?, year?, board_id?)` → `Vec<ObjectiveWithKRs>` | Lists objectives, optionally filtered by quarter/year/board |
| `get_objective` | `(id)` → `ObjectiveWithKRs` | Returns single objective with its KRs and linked board IDs |
| `update_objective` | `(id, title?, description?)` → `Objective` | Updates objective metadata |
| `delete_objective` | `(id)` → `()` | Deletes objective and cascades to its KRs |

#### Key Result Commands (3)

| Command | Signature | Description |
|---|---|---|
| `create_key_result` | `(objective_id, title, initial_value, target_value, unit?, confidence?)` → `KeyResult` | Adds a KR to an objective |
| `update_key_result` | `(id, title?, current_value?, confidence?)` → `KeyResult` | Updates KR progress/confidence. Re-computes objective progress |
| `delete_key_result` | `(id)` → `()` | Removes a KR. Re-computes objective progress |

#### Board Linking Commands (2)

| Command | Signature | Description |
|---|---|---|
| `link_board_to_objective` | `(board_id, objective_id)` → `()` | Links a board to an objective (many-to-many) |
| `unlink_board_from_objective` | `(board_id, objective_id)` → `()` | Removes a board-objective link |

#### Progress Auto-Computation
Whenever `update_key_result` or `delete_key_result` is called, the objective's `progress` field is recalculated:
```rust
fn recalculate_objective_progress(db: &Connection, objective_id: &str) -> Result<(), String> {
    let (sum, count): (f64, i64) = db.query_row(
        "SELECT COALESCE(SUM(
            CASE WHEN target_value > initial_value
                THEN MIN((current_value - initial_value) / (target_value - initial_value) * 100.0, 100.0)
                ELSE 0 END
        ), 0), COUNT(*) FROM okr_key_results WHERE objective_id = ?1",
        [objective_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let progress = if count > 0 { (sum / count as f64).round() } else { 0.0 };
    db.execute(
        "UPDATE okr_objectives SET progress = ?1, updated_at = datetime('now') WHERE id = ?2",
        rusqlite::params![progress, objective_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
```

#### Rust types for OKRs:
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Objective {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub quarter: String,         // "Q1" | "Q2" | "Q3" | "Q4"
    pub year: i32,
    pub progress: f64,           // 0.0 – 100.0, auto-computed
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyResult {
    pub id: String,
    pub objective_id: String,
    pub title: String,
    pub initial_value: f64,
    pub target_value: f64,
    pub current_value: f64,
    pub unit: Option<String>,
    pub confidence: i32,         // 1–10 scale
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ObjectiveWithKRs {
    pub objective: Objective,
    pub key_results: Vec<KeyResult>,
    pub linked_board_ids: Vec<String>,
}
```

### TypeScript Types (`src/types/index.ts`)

The `Task` interface needs `due_date` and `sprint_id` added:

```typescript
export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  position: number;
  board_id: string;
  due_date: string | null;     // ISO "YYYY-MM-DD" or null
  sprint_id: string | null;    // ← ADD THIS: FK → sprints(id), null = backlog
  created_at: string;
  updated_at: string;
}
```

New sprint types:
```typescript
export interface Sprint {
  id: string;
  board_id: string;
  name: string;
  goal: string | null;
  start_date: string;          // "YYYY-MM-DD"
  end_date: string;            // "YYYY-MM-DD"
  status: 'planning' | 'active' | 'complete';
  created_at: string;
  updated_at: string;
}
```

New OKR types:
```typescript
export interface Objective {
  id: string;
  title: string;
  description: string | null;
  quarter: string;             // "Q1" | "Q2" | "Q3" | "Q4"
  year: number;
  progress: number;            // 0–100, auto-computed from KR averages
  created_at: string;
  updated_at: string;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  initial_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  confidence: number;          // 1–10 scale
  created_at: string;
  updated_at: string;
}

export interface ObjectiveWithKRs {
  objective: Objective;
  key_results: KeyResult[];
  linked_board_ids: string[];
}
```

### Database Schema

#### `tasks` table (after migration 004)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `title` | TEXT | — | |
| `description` | TEXT | — | nullable |
| `priority` | TEXT | `'medium'` | `low`, `medium`, `high` |
| `status` | TEXT | `'todo'` | `todo`, `in_progress`, `done` |
| `position` | INTEGER | `0` | Ordering index |
| `board_id` | TEXT | — | FK → `boards(id)` ON DELETE CASCADE |
| `due_date` | TEXT | — | **Added by 004_dates.sql** — ISO "YYYY-MM-DD", nullable |
| `created_at` | TEXT | `datetime('now')` | |
| `updated_at` | TEXT | `datetime('now')` | |

#### Indexes

| Name | Columns | Added By |
|---|---|---|
| `idx_tasks_board` | `board_id` | 001_init.sql |
| `idx_tasks_status` | `status` | 001_init.sql |
| `idx_tasks_due_date` | `due_date` | **004_dates.sql** |

#### Migration SQL

```sql
-- 004_dates.sql
ALTER TABLE tasks ADD COLUMN due_date TEXT;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
```

The `ALTER TABLE` uses `.ok()` in the Rust migration runner to handle existing databases that may already have the column (from failed or partial migrations). It is safe to run multiple times.

---

#### `sprints` table (migration 005)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `board_id` | TEXT | — | FK → `boards(id)` ON DELETE CASCADE |
| `name` | TEXT | — | Sprint name (e.g. "Sprint 3") |
| `goal` | TEXT | — | nullable — sprint objective |
| `start_date` | TEXT | — | ISO "YYYY-MM-DD" |
| `end_date` | TEXT | — | ISO "YYYY-MM-DD" |
| `status` | TEXT | `'planning'` | `planning`, `active`, `complete` |
| `created_at` | TEXT | `datetime('now')` | |
| `updated_at` | TEXT | `datetime('now')` | |

```sql
-- 005_sprints.sql
CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planning' CHECK(status IN ('planning', 'active', 'complete')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sprints_board ON sprints(board_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);

ALTER TABLE tasks ADD COLUMN sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id);
```

#### `okr_objectives` table (migration 006)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `title` | TEXT | — | Objective name |
| `description` | TEXT | — | nullable |
| `quarter` | TEXT | — | `"Q1"`, `"Q2"`, `"Q3"`, `"Q4"` |
| `year` | INTEGER | — | e.g. 2026 |
| `progress` | REAL | `0.0` | Auto-computed 0.0–100.0 |
| `created_at` | TEXT | `datetime('now')` | |
| `updated_at` | TEXT | `datetime('now')` | |

#### `okr_key_results` table (migration 006)

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | TEXT PK | — | UUID |
| `objective_id` | TEXT | — | FK → `okr_objectives(id)` ON DELETE CASCADE |
| `title` | TEXT | — | KR description |
| `initial_value` | REAL | `0` | Starting value |
| `target_value` | REAL | — | Target value to reach |
| `current_value` | REAL | `0` | Current progress value |
| `unit` | TEXT | — | nullable, e.g. "%", "$", "users" |
| `confidence` | INTEGER | `5` | 1–10 scale |
| `created_at` | TEXT | `datetime('now')` | |
| `updated_at` | TEXT | `datetime('now')` | |

#### `board_objectives` junction table (migration 006)

| Column | Type | Default | Notes |
|---|---|---|---|
| `board_id` | TEXT | — | FK → `boards(id)` ON DELETE CASCADE |
| `objective_id` | TEXT | — | FK → `okr_objectives(id)` ON DELETE CASCADE |
| (PK) | | | Composite primary key `(board_id, objective_id)` |

```sql
-- 006_okr.sql
CREATE TABLE IF NOT EXISTS okr_objectives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    quarter TEXT NOT NULL CHECK(quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    year INTEGER NOT NULL,
    progress REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS okr_key_results (
    id TEXT PRIMARY KEY,
    objective_id TEXT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    initial_value REAL NOT NULL DEFAULT 0,
    target_value REAL NOT NULL,
    current_value REAL NOT NULL DEFAULT 0,
    unit TEXT,
    confidence INTEGER NOT NULL DEFAULT 5 CHECK(confidence >= 1 AND confidence <= 10),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_krs_objective ON okr_key_results(objective_id);

CREATE TABLE IF NOT EXISTS board_objectives (
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    objective_id TEXT NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
    PRIMARY KEY (board_id, objective_id)
);

CREATE INDEX IF NOT EXISTS idx_board_objectives_board ON board_objectives(board_id);
CREATE INDEX IF NOT EXISTS idx_board_objectives_objective ON board_objectives(objective_id);
```

## Data Flows

### Set due date on task

```
KanbanTaskModal → user picks date → onSave({ ..., due_date: "2026-07-15" })
  → KanbanBoard.handleSaveTask()
    → invoke('update_task', { id, due_date: "2026-07-15" })
      → Rust UPDATE tasks SET due_date = ?1 WHERE id = ?2
        → Returns Task with due_date populated
          → Frontend re-renders task card with due date badge
```

### Calendar page loads

```
User navigates to /calendar
  → Calendar.tsx mounts
    → Compute startDate = first day of current month ("2026-06-01")
    → Compute endDate = last day of current month ("2026-06-30")
    → invoke('list_tasks_by_date_range', { startDate, endDate })
      → Rust SELECT tasks WHERE due_date >= ?1 AND due_date <= ?2
        → Returns Vec<Task>
          → Group tasks by due_date into Record<string, Task[]>
            → Pass to MonthGrid → render CalendarTaskPill in each day cell
```

### Navigate months

```
User clicks "Next month"
  → CalendarHeader.onNext()
    → Calendar.tsx updates currentDate to next month
      → Re-computes month range
        → invoke('list_tasks_by_date_range', { startDate, endDate })
          → Re-fetches tasks for new month
            → Re-renders MonthGrid with new data
```

### Click task on calendar

```
User clicks CalendarTaskPill
  → onTaskClick(task)
    → navigate(`/kanban/${task.board_id}`)
      → KanbanBoard page loads with the task's board
        → User can see/edit the task in context
```

### Create task with due date

```
KanbanTaskModal → user fills form + picks date → onSave({ ..., due_date: "2026-07-15" })
  → KanbanBoard.handleCreateTask()
    → invoke('create_task', { title, description, priority, status, board_id, due_date: "2026-07-15" })
      → Rust INSERT INTO tasks (...) VALUES (..., due_date)
        → Returns new Task with due_date
          → Task card appears in column with due date badge
```

### Sprint lifecycle

```
User clicks "Create Sprint" → SprintCreateModal
  → Fills name, goal, dates → invoke('create_sprint', { boardId, name, goal, startDate, endDate })
    → Rust INSERT INTO sprints (...) VALUES (...)
      → Sprint created with status = "planning"
        → SprintBar shows new sprint in selector

User clicks "Start Sprint" → SprintBar
  → invoke('get_active_sprint', { boardId })
    → If active sprint exists, show error: "Complete current sprint first"
  → invoke('start_sprint', { sprintId })
    → Rust UPDATE sprints SET status = 'active' WHERE id = ?1
      → Sprint now "active"
        → KanbanBoard filters tasks by this sprint
          → Only tasks with this sprint_id are visible

User clicks "Complete Sprint" → SprintCompleteDialog
  → Dialog shows done/unfinished task counts
  → User confirms → invoke('complete_sprint', { sprintId })
    → Rust UPDATE sprints SET status = 'complete' WHERE id = ?1
    → Rust UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?1 AND status != 'done'
      → Unfinished tasks move to backlog (sprint_id = NULL)
        → SprintBar now shows sprint as "Complete"
          → Board reverts to Backlog mode (shows tasks with sprint_id IS NULL)
```

### OKR creation

```
User navigates to /okrs
  → OKRs page loads
    → invoke('list_objectives', { quarter: "Q2", year: 2026 })
      → Returns Vec<ObjectiveWithKRs>
        → Renders OKRCard for each objective

User clicks "Create Objective" → OKRCreateModal
  → Fills title, description → invoke('create_objective', { title, description, quarter: "Q2", year: 2026 })
    → Rust INSERT INTO okr_objectives (...) VALUES (...)
      → Returns Objective with progress = 0
        → OKRCard appears in list

User clicks on objective → navigates to /okr/{id}
  → OKRDetail page loads
    → invoke('get_objective', { id })
      → Returns ObjectiveWithKRs (objective + KRs + linked board IDs)
        → Renders objective header with progress bar

User clicks "Add Key Result" → KRCreateModal
  → Fills title, initial value, target value → invoke('create_key_result', { objectiveId, title, initialValue, targetValue })
    → Rust INSERT INTO okr_key_results (...) VALUES (...)
      → Calls recalculate_objective_progress()
        → Objective progress updated (e.g., 1 KR at 0/100 → 0%)
          → KRRow appears on detail page

User updates KR progress (edits current_value)
  → invoke('update_key_result', { id, currentValue: 50 })
    → Rust UPDATE okr_key_results SET current_value = 50
      → Calls recalculate_objective_progress()
        → Objective progress = (50-0)/(100-0) * 100 = 50%
          → KRRow shows updated bar, objective progress bar updates to 50%
```

### Board linking

```
User links a board to an objective
  → OKRDetail / OKRCard has "Link Board" option
    → invoke('link_board_to_objective', { boardId, objectiveId })
      → Rust INSERT INTO board_objectives (board_id, objective_id) VALUES (?, ?)
        → Board now linked to objective
          → Navigation: clicking the board link navigates to /kanban/{boardId}

User views an objective
  → invoke('get_objective', { id })
    → Returns ObjectiveWithKRs with linked_board_ids populated
      → UI shows linked boards as clickable badges
        → Click badge → navigate(`/kanban/${boardId}`)

Board page shows linked objectives
  → KanbanBoard loads → invoke('list_objectives', { boardId })
    → Returns objectives linked to this board
      → UI shows "Linked Objectives" section in sidebar/header
        → Click objective → navigate(`/okr/${objectiveId}`)
```

## Task Data Structure (Rust)

```rust
// In src-tauri/src/commands/tasks.rs

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub position: i32,
    pub board_id: String,
    pub due_date: Option<String>,    // "YYYY-MM-DD" or None
    pub created_at: String,
    pub updated_at: String,
}
```

## IPC Patterns

```typescript
import { invoke } from '@tauri-apps/api/core';

// List tasks in date range (for Calendar page)
const tasks = await invoke<Task[]>('list_tasks_by_date_range', {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  boardId: null,              // null = all boards
});

// List tasks for a specific board in date range
const boardTasks = await invoke<Task[]>('list_tasks_by_date_range', {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  boardId: 'some-board-uuid',
});

// Create task with due date
const newTask = await invoke<Task>('create_task', {
  title: 'Finish report',
  description: 'Q2 summary',
  priority: 'high',
  status: 'todo',
  boardId: 'board-uuid',
  dueDate: '2026-07-01',
});

// Update task due date
const updated = await invoke<Task>('update_task', {
  id: 'task-uuid',
  dueDate: '2026-07-15',
});

// Clear due date (set to null)
const cleared = await invoke<Task>('update_task', {
  id: 'task-uuid',
  dueDate: null,
});

// --- Sprint commands ---

// Create a sprint
const sprint = await invoke<Sprint>('create_sprint', {
  boardId: 'board-uuid',
  name: 'Sprint 3',
  goal: 'Complete Q2 features',
  startDate: '2026-07-01',
  endDate: '2026-07-14',
});

// List sprints for a board
const sprints = await invoke<Sprint[]>('list_sprints', {
  boardId: 'board-uuid',
});

// Get active sprint (may be null)
const active = await invoke<Sprint | null>('get_active_sprint', {
  boardId: 'board-uuid',
});

// Start a sprint (transition planning → active)
const started = await invoke<Sprint>('start_sprint', {
  sprintId: 'sprint-uuid',
});

// Complete a sprint (moves unfinished tasks to backlog)
const completed = await invoke<Sprint>('complete_sprint', {
  sprintId: 'sprint-uuid',
});

// Update sprint metadata
const updated = await invoke<Sprint>('update_sprint', {
  id: 'sprint-uuid',
  name: 'Sprint 3 (extended)',
  endDate: '2026-07-16',
});

// Delete a sprint (tasks become backlog)
await invoke<void>('delete_sprint', { id: 'sprint-uuid' });

// --- OKR commands ---

// Create an objective
const objective = await invoke<Objective>('create_objective', {
  title: 'Improve user engagement',
  description: 'Increase DAU and session time',
  quarter: 'Q2',
  year: 2026,
});

// List objectives (optional filters)
const objectives = await invoke<ObjectiveWithKRs[]>('list_objectives', {
  quarter: 'Q2',
  year: 2026,
  boardId: null,           // optional: filter by linked board
});

// Get single objective with KRs and linked boards
const objectiveDetail = await invoke<ObjectiveWithKRs>('get_objective', {
  id: 'objective-uuid',
});

// Create a key result
const kr = await invoke<KeyResult>('create_key_result', {
  objectiveId: 'objective-uuid',
  title: 'Increase DAU by 20%',
  initialValue: 1000,
  targetValue: 1200,
  unit: 'users',
  confidence: 7,
});

// Update KR (auto-recalculates objective progress)
const updatedKr = await invoke<KeyResult>('update_key_result', {
  id: 'kr-uuid',
  currentValue: 1100,
  confidence: 8,
});

// Link board to objective
await invoke<void>('link_board_to_objective', {
  boardId: 'board-uuid',
  objectiveId: 'objective-uuid',
});

// Unlink board from objective
await invoke<void>('unlink_board_from_objective', {
  boardId: 'board-uuid',
  objectiveId: 'objective-uuid',
});
```

## Calendar Month Grouping Logic

```typescript
// In Calendar.tsx
function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!task.due_date) continue;
    if (!map[task.due_date]) map[task.due_date] = [];
    map[task.due_date].push(task);
  }
  return map;
}

// Compute month range
function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}
```

## Design Patterns

### Click-Through Pattern
Calendar tasks are clickable pills that navigate to the task's Kanban board. The calendar is a **view layer** — it does not support inline editing. All task editing happens in the Kanban UI. Navigation: `navigate(`/kanban/${task.board_id}`)`.

### Date Range Queries with Optional Board Filter
`list_tasks_by_date_range` accepts an optional `board_id`. When `null`, it returns tasks across ALL boards — this is the default for the Calendar page. When provided, it filters to a single board (useful for board-specific date views in the future).

### Priority Coloring
Consistent across both Kanban cards and Calendar pills:
- **high**: red tones (`rgba(251, 113, 133, 0.15)` bg, `#E11D48` text)
- **medium**: amber/yellow tones (`rgba(250, 204, 21, 0.15)` bg, `#CA8A04` text)
- **low**: gray tones (`rgba(156, 163, 175, 0.15)` bg, `#6B7280` text)

### Overdue Detection
```typescript
const today = new Date().toISOString().split('T')[0]; // "2026-06-28"
const isOverdue = task.due_date !== null && task.due_date < today;
const isToday = task.due_date === today;
```
- **Overdue** (`due_date < today`) → red badge
- **Due today** (`due_date === today`) → amber badge with "Today" label
- **Future** (`due_date > today`) → normal badge showing formatted date
- **No due date** → no badge shown

### Date Format
All due dates use ISO 8601 calendar-date format: `"YYYY-MM-DD"`. No time component. Comparison is string-based (lexicographic ordering works correctly for ISO dates).

### Data Grouping
Calendar groups tasks by their `due_date` string key. A task appears in exactly one day cell — the day matching its `due_date`. Tasks without a `due_date` are invisible on the calendar.

## Future Features

### Scrum (Sprints) — ✅ Built
Core sprint functionality is implemented:
- **Sprint model**: `sprints` table with `id`, `name`, `start_date`, `end_date`, `board_id`, `goal`
- **Sprint CRUD**: create, list, start, complete, update, delete commands
- **Sprint lifecycle**: Planning → Active → Complete with unfinished tasks moved to backlog
- **UI**: SprintBar, SprintCreateModal, SprintCompleteDialog, sprint selector on Kanban board
- **Backlog mode**: view tasks without a sprint assignment (`sprint_id IS NULL`)

Potential future enhancements:
- **Burndown chart**: plot remaining tasks over sprint duration
- **Sprint velocity**: track completed tasks per sprint for estimation
- **Calendar integration**: show sprint date ranges in Calendar page

### OKRs (Quarterly Goals) — ✅ Built
Core OKR functionality is implemented:
- **OKR model**: `okr_objectives` + `okr_key_results` tables with quarter/year scoping
- **Key Result tracking**: initial_value, target_value, current_value with auto-computed progress
- **Confidence scoring**: 1–10 scale for each KR
- **Board linking**: many-to-many junction table `board_objectives`
- **UI**: OKR list page, detail page, KR editing, OKRWidget, QuarterSelector, CheckInModal

Potential future enhancements:
- **OKR alignment**: roll up from individual → team → company level
- **Task linking**: link KRs to specific tasks via FK
- **Quarterly view**: Calendar page could switch between month and quarter views
- **Progress bars in sidebar**: show KR completion % in IconSidebar

### Other Ideas
- **Gantt chart view**: timeline visualization of tasks with due dates
- **Recurring tasks**: auto-create tasks on a schedule
- **Task dependencies**: blocked-by / blocks relationships between tasks

## Important Gotchas

1. **`due_date` is `Option<String>`** — can be `null`/`None` for tasks without dates. All frontend code must handle `null` gracefully (no badge, no calendar entry, date picker shows empty).

2. **Date format is ISO "YYYY-MM-DD"** throughout the entire stack — SQLite stores as TEXT, Rust passes as `String`, frontend uses `<input type="date">` which natively uses this format. String comparison (`>=`, `<`) works correctly for ISO dates.

3. **Month navigation triggers a new API call** — every month change calls `list_tasks_by_date_range` for the new month range. No client-side caching of past months. Consider adding a lightweight cache if users frequently switch months.

4. **Overdue calculation is purely frontend string comparison** — `due_date < today` using ISO strings works because "2026-06-25" < "2026-06-28" lexicographically. No timezone logic needed since dates have no time component.

5. **`board_id` filter is optional** — when `null`, `list_tasks_by_date_range` returns tasks from **all boards**. The SQL query branches: if `board_id` is `Some`, add `AND board_id = ?3`; if `None`, omit it. Be careful with parameter binding order.

6. **`004_dates.sql` migration uses ALTER TABLE with IF NOT EXISTS** — the index uses `CREATE INDEX IF NOT EXISTS`, but the `ALTER TABLE ADD COLUMN` will error if re-run. The Rust migration runner should handle this with `.ok()` or a check for existing column.

7. **TypeScript `Task` interface must stay in sync with Rust `Task` struct** — both define `due_date: Option<String>` / `due_date: string | null`. If one side is updated without the other, the IPC deserialization will fail silently or throw. Always update both sides together.

8. **Calendar only shows tasks WITH due dates** — tasks without `due_date` are invisible on the calendar. The SQL query explicitly filters `WHERE due_date IS NOT NULL`. If a task has no due date, it won't appear until one is set.

9. **The `get_board` query in `boards.rs` must include `due_date`** — when loading a board's tasks, the SQL `SELECT` must include the `due_date` column. Currently the query only selects 8 columns — adding `due_date` makes it 9. Failing to update this will cause `Task` deserialization errors for boards with dated tasks.

10. **`KanbanTaskModal.onSave` signature changes** — adding `due_date` to the save payload means any code calling `onSave` (in `KanbanBoard.tsx`) must handle the new field. The `handleCreateTask` and `handleSaveTask` callbacks must pass `dueDate` to `invoke`.

11. **Due date badge renders conditionally** — `KanbanTaskCard.tsx` should only render the badge div when `task.due_date` is non-null. Use `{task.due_date && <DueDateBadge .../>}` pattern.

12. **Sidebar navigation needs a Calendar icon** — currently the `IconSidebar.tsx` tabs array doesn't include a calendar link. Add a tab with a `Calendar` icon from `lucide-react` pointing to `/calendar`. The `activeTab()` function needs an additional check for `/calendar`.

13. **`map_task_row` helper in Rust** — to avoid repeating the 9-column SELECT mapping across multiple commands, consider extracting a helper function:
    ```rust
    fn map_task_row(row: &rusqlite::Row) -> rusqlite::Result<Task> {
        Ok(Task {
            id: row.get(0)?, title: row.get(1)?, description: row.get(2)?,
            priority: row.get(3)?, status: row.get(4)?, position: row.get(5)?,
            board_id: row.get(6)?, due_date: row.get(7)?,
            created_at: row.get(8)?, updated_at: row.get(9)?,
        })
    }
    ```
    Currently each command (get_board, create_task, update_task, move_task) has its own inline mapping. Extracting a shared helper reduces duplication.

14. **Calendar page route needs registering** — add `<Route path="/calendar" element={<Calendar />} />` to `App.tsx`. Also update the sidebar tabs array with a `CalendarDays` icon.

### Sprint Gotchas

15. **`sprint_id` on tasks can be `null` (backlog)** — tasks without a sprint assignment belong to the backlog. All frontend code must handle `sprint_id: string | null`. The KanbanBoard's backlog mode shows tasks where `sprint_id IS NULL`.

16. **Only one active sprint per board is allowed** — `start_sprint` checks if any other sprint on the same board has status `"active"`. If so, it returns an error: "An active sprint already exists for this board. Complete it first." This constraint is enforced at the Rust layer, not via a DB partial index.

17. **`complete_sprint` moves unfinished tasks to backlog** — when a sprint is completed, all tasks with `status != 'done'` have their `sprint_id` set to `NULL`. This is done in the Rust command via `UPDATE tasks SET sprint_id = NULL WHERE sprint_id = ?1 AND status != 'done'`. Completed tasks (`status = 'done'`) retain their sprint_id for historical tracking.

18. **Sprint dates must be validated** — `start_date` must be before `end_date`. This is validated server-side in `create_sprint` and `update_sprint`. The frontend should also validate this before submitting.

19. **`KanbanTaskModal` needs `sprint_id` support** — when creating a task, the `sprint_id` should default to the currently selected sprint (or `null` for backlog). The `onSave` callback must include `sprint_id` in its payload. The `create_task` command must accept a `sprint_id` parameter.

### OKR Gotchas

20. **OKR progress is auto-computed from KR averages** — every call to `update_key_result` or `delete_key_result` triggers `recalculate_objective_progress()`, which computes the average of individual KR progress percentages. Formula per KR: `MIN((current_value - initial_value) / (target_value - initial_value) * 100, 100)`. The objective's `progress` field is the mean of all KR percentages. This logic lives in Rust — there is no DB trigger.

21. **Confidence is a 1–10 integer scale, not a percentage** — `confidence` is stored as `INTEGER CHECK(confidence >= 1 AND confidence <= 10)`. It represents the team's confidence in hitting the KR target, not a completion percentage. The frontend should render this as a 1–10 slider or dropdown, not a progress bar.

22. **Quarter format is `"YYYY-QN"`** — quarters are stored as separate `quarter` (`"Q1"`–`"Q4"`) and `year` (integer) columns. When displayed or selected in the UI, they are combined as `"YYYY-QN"` (e.g., `"2026-Q2"`). The `QuarterSelector` component handles parsing and formatting. The `list_objectives` command accepts `quarter` and `year` as separate optional parameters.

23. **Board linking is many-to-many** — a board can link to multiple objectives, and an objective can link to multiple boards. The `board_objectives` junction table has a composite primary key `(board_id, objective_id)`. The `link_board_to_objective` command uses `INSERT OR IGNORE` to prevent duplicate links. The `get_objective` command returns `ObjectiveWithKRs` which includes `linked_board_ids: Vec<String>` — and these IDs are used to render clickable board badges in the UI.

24. **The `get_objective` command returns `ObjectiveWithKRs`** — this compound type includes the objective, its key results, and the list of linked board IDs. The Rust struct is:
    ```rust
    pub struct ObjectiveWithKRs {
        pub objective: Objective,
        pub key_results: Vec<KeyResult>,
        pub linked_board_ids: Vec<String>,
    }
    ```
    The frontend receives all three in a single `invoke('get_objective')` call — there is no separate endpoint for fetching linked boards.

25. **Deleting a KR triggers progress recalculation** — the `delete_key_result` Rust command must call `recalculate_objective_progress()` after deleting, not just `create_key_result` and `update_key_result`. If an objective's last KR is deleted, its progress resets to `0.0`.

26. **Migration 005 uses `ALTER TABLE tasks ADD COLUMN sprint_id`** — this is a schema change on an existing table, similar to 004_dates.sql. The migration runner should use `.ok()` or a column-exists check before running the ALTER TABLE. The `ON DELETE SET NULL` foreign key ensures deleting a sprint does not cascade-delete its tasks.

## Commands

```bash
# Run tests
npm test

# Run Rust tests (includes tasks.rs tests)
npm run test:rust

# Build and run the app for manual testing
npm run tauri dev

# Specific test for calendar/dates
npx vitest run src/test/calendar.spec.ts 2>/dev/null || echo "No calendar tests yet"
```