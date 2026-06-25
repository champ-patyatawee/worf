---
name: widget
description: Draggable/resizable dashboard widget system with 5 widget types, localStorage persistence, and Tauri IPC for real-time backend communication
license: MIT
compatibility: opencode
metadata:
  audience: developers
---

## What I do
- Build and maintain the **Dashboard Widget** system — a draggable/resizable widget grid
- Create or modify widget components in `src/components/dashboard/`
- Wire up widget picker (add/remove) and layout persistence in `src/pages/Dashboard.tsx`
- Manage the `DraggableWidget` container with move/resize/remove handles
- Handle Tauri IPC for real-time widgets (Pomodoro timer with Rust backend events)
- Maintain the neobrutalism design system (bold borders, shadows, pastel backgrounds)

## When to use me
Use when working on the Dashboard module — adding new widget types, modifying drag-and-drop behavior, changing layout persistence, working on the widget picker, or wiring up backend-driven widgets like the Pomodoro timer. Invoke this skill whenever files under `src/components/dashboard/`, `src/pages/Dashboard.tsx`, or the `pomodoro` Rust commands are involved.

## Architecture

### File Tree

```
src/
├── pages/
│   └── Dashboard.tsx                     # Main dashboard — layout state, picker, persistence
├── components/dashboard/
│   ├── index.ts                          # Barrel exports for all 5 widgets
│   ├── DraggableWidget.tsx               # Reusable move/resize/remove container
│   ├── ClockWidget.tsx                   # Live clock (pink #FBCFE8)
│   ├── CalendarWidget.tsx                # Monthly calendar (cream #FFFBEB)
│   ├── PomodoroWidget.tsx                # Pomodoro timer with Tauri IPC (purple #E9D5FF)
│   ├── TaskOverviewWidget.tsx            # Kanban task stats (green #A7F3D0)
│   └── ProjectsWidget.tsx               # Project/board list (yellow #FEF08A)
src-tauri/src/commands/
│   └── pomodoro.rs                       # Rust backend: PomodoroManager state machine
```

### Key Interfaces

```typescript
// DraggableWidget.tsx
export interface WidgetRect {
  x: number;    // CSS left (px)
  y: number;    // CSS top (px)
  w: number;    // CSS width (px)
  h: number;    // CSS height (px)
}

// Dashboard.tsx
export interface WidgetItem {
  id: string;
  rect: WidgetRect;
}

interface WidgetMeta {
  id: string;
  name: string;
  component: React.ReactNode;
  defaultRect: WidgetRect;
}
```

### The 5 Widgets at a Glance

| Widget | ID | Background | Data Source | Route |
|---|---|---|---|---|
| Clock | `clock` | `#FBCFE8` (pink) | Local `setInterval` | — |
| Calendar | `calendar` | `#FFFBEB` (cream) | Local `Date` | — |
| Pomodoro | `pomodoro` | `#E9D5FF` (purple) | Tauri IPC (Rust) | — |
| Tasks | `tasks` | `#A7F3D0` (green) | `invoke("list_boards")` + `invoke("get_board")` | — |
| Projects | `projects` | `#FEF08A` (yellow) | `invoke("list_boards")` + `invoke("get_board")` | `/kanban/:slug` |

## Key Component Breakdown

### `DraggableWidget.tsx` — The Container

**Props:**
```typescript
interface DraggableWidgetProps {
  id: string;
  rect: WidgetRect;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, rect: WidgetRect) => void;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}
```

**Three Control Handles** (hidden until hover via `opacity-0 group-hover:opacity-100`):
1. **Move** (top-left): Grid icon — `onMouseDown` starts drag, clamps to `>= 0`, calls `onMove(id, x, y)` on mouseup
2. **Remove** (top-right): X icon — calls `onRemove(id)` on click
3. **Resize** (bottom-right): Diagonal arrows — `onMouseDown` starts drag, min width `180`, min height `80`, calls `onResize(id, rect)` on mouseup

**Drag Implementation:**
- Uses a `dragState` ref (type `'move' | 'reset'` with start coordinates)
- Global `mousemove`/`mouseup` listeners registered on the `document`
- During move: directly sets `el.style.left` and `el.style.top` pixel values
- During resize: directly sets `el.style.width` and `el.style.height`
- On mouseup: calls the respective callback, then cleans up listeners and `dragState`

**Styling (Neobrutalism):**
```css
border-2 border-[#0D0D0D] rounded-[16px] shadow-[6px_6px_0px_#0D0D0D]
hover:shadow-[8px_8px_0px_#0D0D0D]
```

**Important:** The widget has `position: absolute` and the container uses `position: relative`. Coordinates are pixel-based, not grid-based.

### `Dashboard.tsx` — Layout Orchestrator

**Widget Definition:**
```typescript
const ALL_WIDGETS: WidgetMeta[] = [
  { id: 'pomodoro',  name: 'Pomodoro',  component: <PomodoroWidget />,      defaultRect: { x: 0, y: 2, w: 662, h: 178 } },
  { id: 'calendar',  name: 'Calendar',  component: <CalendarWidget />,      defaultRect: { x: 0, y: 197, w: 344, h: 274 } },
  { id: 'clock',     name: 'Clock',     component: <ClockWidget />,         defaultRect: { x: 369, y: 203, w: 292, h: 257 } },
  { id: 'projects',  name: 'Projects',  component: <ProjectsWidget />,      defaultRect: { x: 691, y: 8, w: 371, h: 448 } },
  { id: 'tasks',     name: 'Tasks',     component: <TaskOverviewWidget />,  defaultRect: { x: 0, y: 486, w: 190, h: 232 } },
];
```

**Layout Persistence:**
- `LAYOUT_KEY = 'dashboard-layout'`
- `loadLayout()`: reads from `localStorage`, filters out stale widget IDs, **auto-merges** any new widgets from `DEFAULT_LAYOUT` that aren't in the saved layout
- `saveLayout()`: writes to `localStorage` with **500ms debounce** via `setTimeout`/`clearTimeout`
- Auto-save is triggered on every move, resize, add, or remove operation

**Widget Picker:**
- Toggled by the "Widgets" button in the header
- `availableWidgets = ALL_WIDGETS.filter((w) => !layoutIds.has(w.id))` — only shows widgets not already on the dashboard
- Clicking a widget calls `handleAdd(id)` which offsets the new widget by `prev.length * 20` to avoid overlap
- Shows "All widgets are on the dashboard" when all 5 are active
- Backdrop click dismisses via a fullscreen transparent overlay

**Container Sizing:**
- `minHeight: Math.max(500, maxY + 20)` — computed from the maximum Y + height of all current widgets

### `ClockWidget.tsx` — Live Clock

- Updates every 1 second via `setInterval`
- Displays: 12-hour time (HH:MM:SS), AM/PM indicator, full date string
- No external dependencies — purely local state

### `CalendarWidget.tsx` — Monthly Calendar

- **State**: `year` and `month` (numeric), initialized to today
- **Grid computation**: `getMonthGrid(year, month)` pads leading nulls for day-of-week offset, fills days, trailing nulls to complete 7-column grid
- **Navigation**: Chevron buttons for prev/next month with year rollover
- **Today highlight**: Matches day/month/year against current date, shows accent-colored badge with neobrutalism shadow

### `PomodoroWidget.tsx` — Timer with Tauri IPC

**Tauri Commands Used:**
| Command | Payload | Returns | Purpose |
|---|---|---|---|
| `get_pomodoro_state` | — | `PomodoroState` | Load initial state on mount |
| `start_pomodoro` | `{ workMinutes, breakMinutes }` | — | Start the timer thread |
| `stop_pomodoro` | — | — | Stop the timer thread |

**Tauri Events Listened To:**
| Event | Payload | Purpose |
|---|---|---|
| `pomodoro-tick` | `PomodoroState` | Update display every second |
| `pomodoro-complete` | `()` | Play audio beep on timer completion |

**State Machine (Frontend perspective):**
- Start/stop toggles via `invoke("start_pomodoro")` / `invoke("stop_pomodoro")`
- Ticks from backend drive all UI state (mode, timeLeft, isRunning)
- On completion, the backend auto-switches work↔break and continues — the frontend just plays audio
- Reset calls `invoke("stop_pomodoro")` + resets local state to work mode with full duration

**Editable Durations:**
- Click the "Xm" label to edit (inline input, only when timer is NOT running)
- Range: 1-60 minutes (clamped to `Math.max(60, Math.min(3600, seconds))`)
- Escape cancels, Enter or blur saves
- Editing work updates `timeLeft` only if currently in work mode and not running (same for break)

**Circular Progress:**
- SVG circle: `r=44`, stroke width 6
- `strokeDasharray = 2 * Math.PI * r`
- `strokeDashoffset = circumference - (progress / 100) * circumference`
- CSS `transition-all duration-500` for smooth animation
- Work mode uses accent color, break mode uses success color

**Audio Feedback:**
- Web Audio API: 880Hz sine wave oscillator, 0.3 gain, 150ms duration
- Triggered on `pomodoro-complete` event
- Cleanup: `setTimeout(() => ctx.close(), 500)` to release audio resources

### `TaskOverviewWidget.tsx` — Kanban Task Stats

- Fetches all boards via `invoke("list_boards")`, then fetches each board's tasks via `invoke("get_board", { idOrSlug })`
- Computes: total, todo, in_progress, done counts
- Shows a progress bar with dynamic color: green (>=70%), yellow (>=40%), red (<40%)
- Uses a `cancelled` flag for clean unmount handling
- Shows spinner while loading, error message on failure

### `ProjectsWidget.tsx` — Board List

- Fetches all boards with task counts (parallel `Promise.all`)
- Shows count: "N projects" in large font
- Lists up to 5 boards as clickable buttons — navigates to `/kanban/:slug` via `useNavigate`
- Shows "View all N projects" link when >5 boards exist
- Uses a `cancelled` flag for clean unmount handling
- Empty state: "No projects yet"

### `pomodoro.rs` — Rust Backend State Machine

**Struct:**
```rust
pub struct PomodoroManager {
    pub state: Mutex<PomodoroState>,
}

pub struct PomodoroState {
    pub mode: String,            // "work" | "break"
    pub is_running: bool,
    pub time_left: u64,          // seconds remaining
    pub work_duration: u64,      // total work seconds
    pub break_duration: u64,     // total break seconds
}
```

**Commands:**

| Command | Logic |
|---|---|
| `get_pomodoro_state` | Locks mutex, returns cloned state |
| `start_pomodoro` | Sets state to running in work mode, spawns a **thread** that loops: sleeps 1s, decrements `time_left`, emits `pomodoro-tick` event. On zero: stops, plays macOS system sound (`afplay Ping.aiff`), emits `pomodoro-complete`, pauses 100ms, auto-switches mode (work⇄break), sets `time_left` to the new mode's duration, and continues running |
| `stop_pomodoro` | Sets `is_running = false` — the timer thread checks this flag and exits on next iteration |

**Key Design Detail — Auto-Switch:**
When a timer completes, the backend:
1. Sets `is_running = false`
2. Drops the lock
3. Plays system sound + emits `pomodoro-complete`
4. Re-acquires the lock
5. Checks if user manually stopped during the 100ms window — if `is_running` is unexpectedly true (manual re-start), it exits
6. Otherwise switches mode, sets time_left, sets `is_running = true`, emits `pomodoro-tick`

## Data Flows

### Layout Persistence Flow
```
Dashboard mounts → loadLayout() → localStorage.getItem("dashboard-layout")
  → Valid JSON? → Filter stale IDs → Merge missing new widgets → setLayout(result)
  → Invalid/missing? → setLayout(DEFAULT_LAYOUT)

User moves/resizes/adds/removes → setLayout → scheduleSave(next)
  → 500ms debounce → saveLayout(l) → localStorage.setItem("dashboard-layout", JSON.stringify(l))
```

### Pomodoro IPC Flow
```
PomodoroWidget mounts → invoke("get_pomodoro_state") → set initial state
  → listen("pomodoro-tick") → update mode/timeLeft/isRunning/workDuration/breakDuration
  → listen("pomodoro-complete") → play 880Hz beep

User clicks Start → invoke("start_pomodoro", { workMinutes, breakMinutes })
  → Rust spawns thread → every 1s: decrement time_left → emit "pomodoro-tick"
  → Frontend receives tick → updates UI

Timer hits 0 → Rust: is_running=false, play afplay Ping.aiff, emit "pomodoro-complete"
  → Frontend plays Web Audio beep
  → Rust: auto-switch to break mode, set time_left=break_duration, is_running=true
  → Rust: emit "pomodoro-tick" with new state → Frontend updates

User clicks Stop → invoke("stop_pomodoro") → Rust: is_running=false → thread exits
User clicks Reset → invoke("stop_pomodoro") + reset local state
```

### TaskOverview/Projects Data Flow
```
Widget mounts → invoke("list_boards") → get all board IDs
  → For each board: invoke("get_board", { idOrSlug: board.id }) → get tasks
  → TaskOverview: aggregate counts (total/todo/in_progress/done)
  → Projects: build BoardSummary[] with taskCount
  → Both: render with loading/error/empty states
  → Cleanup: cancelled flag prevents setState after unmount
```

## Design Patterns

1. **Self-contained widgets**: Each widget manages its own state, fetching, and lifecycle internally. No shared state or context between widgets.

2. **Neobrutalism styling**: Consistent pattern across all widgets and controls:
   ```css
   border-2 border-[#0D0D0D] rounded-[16px] shadow-[6px_6px_0px_#0D0D0D]
   ```
   Buttons use a "pushable" pattern:
   ```css
   hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D0D0D]
   active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#0D0D0D]
   ```

3. **Pastel backgrounds**: Each widget has a unique pastel background color, defined inline via `style={{ backgroundColor: '...' }}`:

4. **`min-h-full`**: All widgets use `min-h-full` on their root div to fill the draggable container's height.

5. **Cancelled flag for async**: Widgets that fetch data (TaskOverview, Projects) use a `cancelled` boolean in the `useEffect` cleanup to prevent state updates after unmount.

6. **Inline editable durations**: Click-to-edit pattern with auto-focus input, Enter to confirm, Escape to cancel — used in PomodoroWidget.

7. **SVG progress ring**: Circular timer visualization using SVG circle with `strokeDasharray`/`strokeDashoffset`, animated via CSS transition.

## Important Gotchas

1. **Coordinates are pixel-based, not grid-based.** The `DraggableWidget` uses absolute positioning with pixel values. There is no snap-to-grid or responsive grid system. Widgets may overlap if manually positioned.

2. **No boundary containment during drag.** The move handler clamps to `>= 0` but does NOT clamp to the container's width/height. Widgets can be dragged partially or fully off-screen to the right/bottom.

3. **Min size enforced client-side only.** `minWidth: 180` and `minHeight: 80` are enforced in the `handleResizeStart` mouseup handler and the inline style, but there is no server-side or validation-layer enforcement.

4. **localStorage has no size limit check.** Layout data is serialized as JSON and stored in `localStorage` with no quota monitoring. Very large layouts could silently fail.

5. **Pomodoro thread lifetime.** The Rust backend spawns a raw thread (not async). If the Tauri app window is closed while the timer is running, the thread continues until it checks `is_running` and exits. The thread is NOT managed or cancellable from outside the stop signal.

6. **Pomodoro start does not check if already running.** Calling `invoke("start_pomodoro")` while a timer is already running will set the state and spawn a **second** thread. The original thread will detect `is_running = false` (overwritten by the new start) and exit, but there is a brief overlap window.

7. **Clock updates via setInterval.** The ClockWidget uses `setInterval` with a 1-second interval. If the tab is backgrounded, browser throttling may cause the clock to skip seconds or show stale time on return (React state won't catch up until the next interval fires).

8. **TaskOverview/Projects call get_board for every board.** This is O(n) Rust commands for n boards, each hitting SQLite. This could be slow with many boards. Consider a batch endpoint for large-scale use.

9. **TaskOverview progress bar color.** The progress bar uses dynamic color thresholds: `pct >= 70` → green (success), `pct >= 40` → yellow (warning), else red (error). These are hardcoded.

10. **Widget picker uses absolute positioning.** The picker dropdown is positioned at `right-4 top-14` relative to the nearest positioned ancestor. It uses a fullscreen transparent overlay (`fixed inset-0 z-40`) for backdrop dismissal.

11. **New widgets get offset to avoid overlap.** `handleAdd` offsets the new widget by `prev.length * 20` in both x and y, but does NOT check for actual overlap against existing widgets. Consecutive additions will stair-step down-right.

12. **DraggableWidget handles are CSS-only visibility.** The three control handles use `opacity-0 group-hover:opacity-100`, meaning they are invisible on touch devices that don't support hover. This makes the widgets non-draggable/resizable/removable on mobile.

## Adding a New Widget

To add a new widget type:

1. Create the widget component in `src/components/dashboard/` following the pattern:
   - Root div with `min-h-full` and a pastel inline background color
   - Self-contained state management
   - Optional backend data fetching with cancelled flag

2. Export it from `src/components/dashboard/index.ts`

3. Register it in `Dashboard.tsx`:
   - Add a new entry to `ALL_WIDGETS` with unique `id`, display `name`, the `<Component />`, and a `defaultRect` with initial position/size

4. The layout persistence system automatically handles:
   - Auto-merging into existing saved layouts
   - Available in the widget picker dropdown

## Commands

```bash
# Run tests related to dashboard widgets
npx vitest run src/test/dashboard.spec.ts

# Run all frontend tests
npm test

# Run backend tests (pomodoro)
cargo test -p app pomodoro
```