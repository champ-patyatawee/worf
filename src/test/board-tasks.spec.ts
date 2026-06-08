import { describe, it, expect } from "vitest";

describe("Board with 3 tasks data flow", () => {
  const board = { name: "Sprint 12", slug: "sprint-12" };
  const tasks = [
    { title: "Design login page", status: "todo", priority: "high" },
    { title: "Implement API", status: "in_progress", priority: "medium" },
    { title: "Write tests", status: "done", priority: "low" },
  ];

  it("board should have correct name", () => {
    expect(board.name).toBe("Sprint 12");
    expect(board.slug).toBe("sprint-12");
  });

  it("board should have exactly 3 tasks", () => {
    expect(tasks.length).toBe(3);
  });

  it("tasks should have valid statuses", () => {
    const validStatuses = ["todo", "in_progress", "done"];
    for (const task of tasks) {
      expect(validStatuses).toContain(task.status);
    }
  });

  it("tasks should have valid priorities", () => {
    const validPriorities = ["low", "medium", "high"];
    for (const task of tasks) {
      expect(validPriorities).toContain(task.priority);
    }
  });

  it("tasks should span all 3 columns", () => {
    const statuses = tasks.map((t) => t.status);
    expect(statuses).toContain("todo");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("done");
  });

  it("each task should have a unique title", () => {
    const titles = tasks.map((t) => t.title);
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  it("data should be sortable by status for column rendering", () => {
    const byStatus = (status: string) => tasks.filter((t) => t.status === status);
    expect(byStatus("todo").length).toBe(1);
    expect(byStatus("in_progress").length).toBe(1);
    expect(byStatus("done").length).toBe(1);
    expect(byStatus("todo")[0].title).toBe("Design login page");
  });
});
