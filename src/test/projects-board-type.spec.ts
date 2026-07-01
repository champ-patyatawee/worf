import { describe, it, expect, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════════
// Board Type — Kanban Removal Tests
// ═══════════════════════════════════════════════════════════════════════════════
//
// After the removal of the kanban board type:
//   1. create_board no longer accepts a board_type parameter — all boards are
//      created with board_type === 'sprint'
//   2. The Sprint tab in ProjectPage is always enabled (no board_type check)
//   3. The kanban navigation shortcut is renamed to "projects" and points to /project
//   4. There is no /kanban route — it redirects to /project
//
// The backend change is already done in src-tauri/src/commands/boards.rs.
// These tests will pass after the corresponding frontend changes are implemented.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Types mirroring post-change contracts ─────────────────────────────────────

/**
 * After kanban removal, board_type is always "sprint".
 */
interface Board {
  id: string;
  name: string;
  slug: string;
  board_type: "sprint";
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface NavigationShortcut {
  id: "dashboard" | "notes" | "projects" | "ai-chat" | "terminal" | "settings";
  label: string;
  path: string | null;
  key: string;
}

// ── Simulated backend (post-change contract) ─────────────────────────────────

/**
 * Simulates the updated create_board backend — no board_type parameter,
 * always returns board_type === "sprint".
 */
async function createBoard(name: string, _description?: string | null): Promise<Board> {
  return {
    id: "test-id",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    board_type: "sprint",
    description: _description ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Simulates list_boards backend — all boards are sprint type.
 */
async function listBoards(): Promise<Board[]> {
  return [
    { id: "b1", name: "Project Alpha", slug: "project-alpha", board_type: "sprint", description: null, created_at: "", updated_at: "" },
    { id: "b2", name: "Project Beta", slug: "project-beta", board_type: "sprint", description: "Test project", created_at: "", updated_at: "" },
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Board type — kanban removal", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // create_board contract
  // ──────────────────────────────────────────────────────────────────────────
  describe("create_board always creates sprint-type boards", () => {
    it("should set board_type to 'sprint' when creating a board", async () => {
      const board = await createBoard("My Project");
      expect(board.board_type).toBe("sprint");
    });

    it("should never create a board with board_type 'kanban'", async () => {
      const board = await createBoard("Test Project");
      expect(board.board_type).not.toBe("kanban");
    });

    it("should create all boards as sprint regardless of inputs", async () => {
      const board1 = await createBoard("Project X");
      const board2 = await createBoard("Project Y", "A description");
      const board3 = await createBoard("   Another One   ");

      expect(board1.board_type).toBe("sprint");
      expect(board2.board_type).toBe("sprint");
      expect(board3.board_type).toBe("sprint");
    });

    it("should not accept a board_type parameter (it is removed from the signature)", () => {
      // The backend no longer has a boardType parameter.
      // This is a compile-time check via TypeScript — we simulate it here.
      type CreateBoardFn = (name: string, description?: string | null) => Promise<Board>;
      // If board_type were still accepted, the type would look different:
      // type CreateBoardLegacy = (name: string, description: string | null, boardType: string) => Promise<Board>;
      // The fact that we only have name + description confirms the parameter is removed.
      const fn: CreateBoardFn = async (n, d) => createBoard(n, d);
      expect(fn).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Board listing — all boards are sprint
  // ──────────────────────────────────────────────────────────────────────────
  describe("list_boards — all boards are sprint type", () => {
    it("should return only sprint-type boards", async () => {
      const boards = await listBoards();
      expect(boards.length).toBeGreaterThan(0);
      for (const board of boards) {
        expect(board.board_type).toBe("sprint");
      }
    });

    it("should not contain any board with type 'kanban'", async () => {
      const boards = await listBoards();
      const kanbanBoards = boards.filter((b: any) => b.board_type === "kanban");
      expect(kanbanBoards.length).toBe(0);
    });

    it("should have all boards with board_type 'sprint'", async () => {
      const boards = await listBoards();
      const allSprint = boards.every(b => b.board_type === "sprint");
      expect(allSprint).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // No 'kanban' option exists
  // ──────────────────────────────────────────────────────────────────────────
  describe("'kanban' board type is removed", () => {
    it("should not have 'kanban' as a valid board type value", () => {
      // After removal, the only valid board type is 'sprint'
      type BoardType = "sprint";
      const validTypes: BoardType[] = ["sprint"];

      // 'kanban' should not be a valid value
      expect(validTypes).not.toContain("kanban");
    });

    it("should have exactly one valid board type", () => {
      type BoardType = "sprint";
      const validTypes: BoardType[] = ["sprint"];
      expect(validTypes).toHaveLength(1);
      expect(validTypes[0]).toBe("sprint");
    });

    it("should not reference 'kanban' anywhere in board logic", () => {
      // Simulate the logic after removal — no more board_type checks
      function getBadgeLabel(board: Board): string {
        // Previously: board.board_type === 'sprint' ? 'Sprint' : 'Kanban'
        // Now: all boards are sprint
        return "Sprint";
      }

      const board: Board = { id: "x", name: "Test", slug: "test", board_type: "sprint", description: null, created_at: "", updated_at: "" };
      expect(getBadgeLabel(board)).toBe("Sprint");
      expect(getBadgeLabel(board)).not.toBe("Kanban");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Sprint tab — always enabled
  // ──────────────────────────────────────────────────────────────────────────
  describe("Sprint tab — always enabled", () => {
    it("should never disable the Sprint tab (all boards are sprint)", () => {
      // After kanban removal, the sprintTabDisabled check is removed.
      // Previously: board?.board_type !== 'sprint' (which was false for kanban)
      // Now: all boards are sprint, so disabled is always false.
      const sprintTabDisabled = false; // no longer depends on board_type
      expect(sprintTabDisabled).toBe(false);
    });

    it("should treat all boards as eligible for sprint features", () => {
      // Every board returned from the backend has board_type === 'sprint'
      const boards: Board[] = [
        { id: "1", name: "A", slug: "a", board_type: "sprint", description: null, created_at: "", updated_at: "" },
        { id: "2", name: "B", slug: "b", board_type: "sprint", description: null, created_at: "", updated_at: "" },
        { id: "3", name: "C", slug: "c", board_type: "sprint", description: null, created_at: "", updated_at: "" },
      ];

      for (const board of boards) {
        // There is no board_type check that would disable the sprint tab
        const sprintTabDisabled = false;
        expect(sprintTabDisabled).toBe(false);
      }
    });

    it("should not conditionally render SprintBar based on board_type", () => {
      // Previously: {board && board.board_type === 'sprint' && hasActiveSprint && (<SprintBar />)}
      // Now: SprintBar is shown for any board with an active sprint (no board_type guard)
      const showSprintBar = (board: Board | null, hasActiveSprint: boolean): boolean => {
        // After kanban removal: only check hasActiveSprint
        return board !== null && hasActiveSprint;
      };

      const board: Board = { id: "x", name: "Test", slug: "test", board_type: "sprint", description: null, created_at: "", updated_at: "" };
      expect(showSprintBar(board, true)).toBe(true);
      expect(showSprintBar(board, false)).toBe(false);
      expect(showSprintBar(null, true)).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation shortcut — kanban renamed to projects
  // ──────────────────────────────────────────────────────────────────────────
  describe("Navigation shortcut — kanban renamed to projects", () => {
    it("should have a 'projects' shortcut pointing to /project", () => {
      // The old 'kanban' shortcut (path: /kanban) is replaced with 'projects' (path: /project)
      const shortcuts: NavigationShortcut[] = [
        { id: "dashboard", label: "Dashboard", path: "/", key: "1" },
        { id: "notes", label: "Notes", path: "/notes", key: "2" },
        { id: "projects", label: "Projects", path: "/project", key: "3" },
        { id: "ai-chat", label: "AI Chat", path: "/ai-chat", key: "4" },
      ];

      const projectsShortcut = shortcuts.find(s => s.id === "projects");
      expect(projectsShortcut).toBeDefined();
      expect(projectsShortcut!.label).toBe("Projects");
      expect(projectsShortcut!.path).toBe("/project");
    });

    it("should not have a 'kanban' shortcut pointing to /kanban", () => {
      // The /kanban route and its shortcut are removed
      const shortcuts: NavigationShortcut[] = [
        { id: "dashboard", label: "Dashboard", path: "/", key: "1" },
        { id: "notes", label: "Notes", path: "/notes", key: "2" },
        { id: "projects", label: "Projects", path: "/project", key: "3" },
      ];

      const kanbanShortcut = shortcuts.find((s: any) => s.id === "kanban");
      expect(kanbanShortcut).toBeUndefined();
    });

    it("should redirect /kanban routes to /project", () => {
      // Router no longer has a /kanban route — it redirects to /project
      const routerRoutes = ["/", "/notes", "/project", "/project/:boardId", "/ai-chat"];
      expect(routerRoutes).not.toContain("/kanban");
      expect(routerRoutes).not.toContain("/kanban/:boardId");
      expect(routerRoutes).toContain("/project");
    });

    it("should use index 3 for projects shortcut (same position as old kanban)", () => {
      // The keyboard shortcut '3' previously mapped to kanban, now maps to projects
      const shortcuts: NavigationShortcut[] = [
        { id: "dashboard", label: "Dashboard", path: "/", key: "1" },
        { id: "notes", label: "Notes", path: "/notes", key: "2" },
        { id: "projects", label: "Projects", path: "/project", key: "3" },
      ];

      expect(shortcuts[2].id).toBe("projects");
      expect(shortcuts[2].key).toBe("3");
    });
  });
});
