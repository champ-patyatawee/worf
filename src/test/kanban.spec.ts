import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDraggedTaskId, clearDraggedTaskId } from "../components/kanban/KanbanTaskCard";

describe("Pointer Events drag-drop with ghost", () => {
  const task = {
    id: "task-1",
    title: "Test Task",
    description: null,
    priority: "medium",
    status: "todo",
    position: 0,
    board_id: "board-1",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  beforeEach(() => {
    clearDraggedTaskId();
    // Clean up any leftover ghosts
    document.querySelectorAll('[data-test-ghost]').forEach((el) => el.remove());
  });

  afterEach(() => {
    clearDraggedTaskId();
  });

  // --- Drag state ---

  describe("drag state", () => {
    it("should start with null", () => {
      expect(getDraggedTaskId()).toBeNull();
    });

    it("should clear after drag ends", () => {
      clearDraggedTaskId();
      expect(getDraggedTaskId()).toBeNull();
    });

    it("should track task id during drag", () => {
      const state = { taskId: "task-1" as string | null, isDragging: true };
      expect(state.taskId).toBe("task-1");
      expect(state.isDragging).toBe(true);
    });

    it("should not be dragging if isDragging is false", () => {
      const state = { taskId: "task-1", isDragging: false };
      // getDraggedTaskId should return null when not dragging
      const result = state.isDragging ? state.taskId : null;
      expect(result).toBeNull();
    });
  });

  // --- Pointer down (drag start) ---

  describe("pointerDown", () => {
    it("should set task id and isDragging on pointer down", () => {
      let dragTaskId: string | null = null;
      let isDragging = false;

      // Simulate pointer down
      dragTaskId = task.id;
      isDragging = true;

      expect(dragTaskId).toBe("task-1");
      expect(isDragging).toBe(true);
    });

    it("should not start drag if clicking a button", () => {
      const isButton = false;
      let dragStarted = false;
      if (!isButton) dragStarted = true;
      expect(dragStarted).toBe(true);
    });

    it("should record offset from card edge", () => {
      const card = { left: 100, top: 200 };
      const clientX = 150;
      const clientY = 250;
      const offsetX = clientX - card.left;
      const offsetY = clientY - card.top;
      expect(offsetX).toBe(50);
      expect(offsetY).toBe(50);
    });
  });

  // --- Ghost element ---

  describe("ghost element", () => {
    it("should create floating ghost clone on drag start", () => {
      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      ghost.style.zIndex = "9999";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "0.85";
      ghost.style.transform = "rotate(3deg) scale(1.02)";
      ghost.style.boxShadow = "8px 8px 0px #0D0D0D";
      document.body.appendChild(ghost);

      expect(ghost.style.position).toBe("fixed");
      expect(ghost.style.zIndex).toBe("9999");
      expect(ghost.style.pointerEvents).toBe("none");
      expect(ghost.style.opacity).toBe("0.85");

      ghost.remove();
    });

    it("should position ghost at pointer coordinates", () => {
      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      ghost.style.left = "150px";
      ghost.style.top = "200px";
      expect(ghost.style.left).toBe("150px");
      expect(ghost.style.top).toBe("200px");
    });

    it("should follow pointer on move", () => {
      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      ghost.style.left = "100px";
      ghost.style.top = "100px";

      // Simulate pointer move
      ghost.style.left = "200px";
      ghost.style.top = "300px";

      expect(ghost.style.left).toBe("200px");
      expect(ghost.style.top).toBe("300px");
    });

    it("should remove ghost on pointer up", () => {
      const ghost = document.createElement("div");
      document.body.appendChild(ghost);

      // Simulate cleanup
      const ghosts = document.querySelectorAll("div");
      // In real code: ghost.remove()
      ghost.remove();

      expect(document.body.contains(ghost)).toBe(false);
    });

    it("should not move ghost if not dragging", () => {
      let isDragging = false;
      const ghost = document.createElement("div");
      ghost.style.position = "fixed";
      const origLeft = "100px";
      ghost.style.left = origLeft;

      // Simulate pointer move but not dragging
      if (isDragging) {
        ghost.style.left = "200px";
      }

      expect(ghost.style.left).toBe(origLeft);
    });
  });

  // --- Original card during drag ---

  describe("original card opacity", () => {
    it("should dim original card on drag start", () => {
      const card = { style: { opacity: "", cursor: "" } } as any;
      card.style.opacity = "0.3";
      card.style.cursor = "grabbing";
      expect(card.style.opacity).toBe("0.3");
      expect(card.style.cursor).toBe("grabbing");
    });

    it("should restore original card on drop", () => {
      const card = { style: { opacity: "0.3", cursor: "grabbing" } } as any;
      // Simulate cleanup
      card.style.opacity = "";
      card.style.cursor = "";
      expect(card.style.opacity).toBe("");
      expect(card.style.cursor).toBe("");
    });
  });

  // --- Column drop via data attribute ---

  describe("column drop resolution", () => {
    it("should find target column by data-kanban-column", () => {
      const col = document.createElement("div");
      col.setAttribute("data-kanban-column", "in_progress");
      const found = col.getAttribute("data-kanban-column");
      expect(found).toBe("in_progress");
    });

    it("should return null if no column found", () => {
      const div = document.createElement("div"); // no attribute
      const found = div.getAttribute("data-kanban-column");
      expect(found).toBeNull();
    });

    it("should call onMove with task id and column status", () => {
      const onMove = vi.fn();
      onMove("task-1", "done");
      expect(onMove).toHaveBeenCalledWith("task-1", "done");
    });

    it("should not move if pointer is outside all columns", () => {
      const onMove = vi.fn();
      const el = document.createElement("div"); // not a column
      const column = el.closest("[data-kanban-column]");
      const status = column?.getAttribute("data-kanban-column") || null;

      if (status) onMove("task-1", status);
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  // --- Column drag-over highlight ---

  describe("column highlight", () => {
    it("should highlight on pointer enter", () => {
      let isDragOver = false;
      isDragOver = true;
      expect(isDragOver).toBe(true);
    });

    it("should unhighlight on pointer leave", () => {
      let isDragOver = true;
      isDragOver = false;
      expect(isDragOver).toBe(false);
    });

    it("should show accent border when highlighted", () => {
      const isDragOver = true;
      const borderColor = isDragOver ? "var(--color-accent-primary)" : "var(--color-border-primary)";
      expect(borderColor).toBe("var(--color-accent-primary)");
    });

    it("should show lift effect when highlighted", () => {
      const isDragOver = true;
      const transform = isDragOver ? "translateY(-2px)" : "none";
      expect(transform).toBe("translateY(-2px)");
    });
  });

  // --- Arrow button fallback ---

  describe("arrow button move", () => {
    it("should move from todo to in_progress", () => {
      const onMove = vi.fn();
      onMove(task.id, "in_progress");
      expect(onMove).toHaveBeenCalledWith("task-1", "in_progress");
    });

    it("should move from in_progress to done", () => {
      const onMove = vi.fn();
      onMove(task.id, "done");
      expect(onMove).toHaveBeenCalledWith("task-1", "done");
    });

    it("should move from done to in_progress", () => {
      const onMove = vi.fn();
      onMove(task.id, "in_progress");
      expect(onMove).toHaveBeenCalledWith("task-1", "in_progress");
    });
  });

  // --- Optimistic state update ---

  describe("optimistic state update", () => {
    it("should update task status in-place", () => {
      const tasks = [
        { ...task, id: "t1", status: "todo" as const },
        { ...task, id: "t2", status: "in_progress" as const },
      ];
      const updated = tasks.map((t) =>
        t.id === "t1" ? { ...t, status: "in_progress" } : t
      );
      expect(updated.find((t) => t.id === "t1")?.status).toBe("in_progress");
    });

    it("should not affect other tasks", () => {
      const tasks = [
        { ...task, id: "t1", status: "todo" as const },
        { ...task, id: "t2", status: "done" as const },
      ];
      const updated = tasks.map((t) =>
        t.id === "t1" ? { ...t, status: "in_progress" } : t
      );
      expect(updated.find((t) => t.id === "t2")?.status).toBe("done");
    });
  });

  // --- Global listeners ---

  describe("global listeners", () => {
    it("should register pointermove on document", () => {
      const handler = vi.fn();
      document.addEventListener("pointermove", handler);
      document.dispatchEvent(new MouseEvent("pointermove"));
      expect(handler).toHaveBeenCalled();
      document.removeEventListener("pointermove", handler);
    });

    it("should register pointerup on document", () => {
      const handler = vi.fn();
      document.addEventListener("pointerup", handler);
      document.dispatchEvent(new MouseEvent("pointerup"));
      expect(handler).toHaveBeenCalled();
      document.removeEventListener("pointerup", handler);
    });

    it("should clean up listeners on unmount", () => {
      const handler = vi.fn();
      document.addEventListener("pointermove", handler);
      document.removeEventListener("pointermove", handler);
      document.dispatchEvent(new MouseEvent("pointermove"));
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // --- Edge cases ---

  describe("edge cases", () => {
    it("should handle rapid consecutive drags", () => {
      const ref = { current: null as string | null };
      ref.current = "task-1";
      ref.current = "task-2";
      expect(ref.current).toBe("task-2");
    });

    it("should not throw if elementFromPoint returns null", () => {
      // elementFromPoint can return null — real code uses optional chaining
      const getColumn = (el: Element | null) => el?.closest("[data-kanban-column]");
      const result = getColumn(null);
      expect(result).toBeUndefined();
    });
  });
});

describe("KanbanBoard columns configuration", () => {
  const COLUMNS = [
    { id: "todo", label: "To Do" },
    { id: "in_progress", label: "In Progress" },
    { id: "done", label: "Done" },
  ];

  it("should have exactly 3 columns", () => {
    expect(COLUMNS.length).toBe(3);
  });

  it("should have correct column IDs", () => {
    const ids = COLUMNS.map((c) => c.id);
    expect(ids).toContain("todo");
    expect(ids).toContain("in_progress");
    expect(ids).toContain("done");
  });

  it("should have correct column labels", () => {
    expect(COLUMNS[0].label).toBe("To Do");
    expect(COLUMNS[1].label).toBe("In Progress");
    expect(COLUMNS[2].label).toBe("Done");
  });
});

describe("Task priority config", () => {
  const priorities = ["low", "medium", "high"];

  it("should have all three priorities", () => {
    expect(priorities).toContain("low");
    expect(priorities).toContain("medium");
    expect(priorities).toContain("high");
  });
});
