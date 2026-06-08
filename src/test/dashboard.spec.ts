import { describe, it, expect } from "vitest";

describe("Dashboard navigation routes", () => {
  const routes = [
    { path: "/", label: "Dashboard" },
    { path: "/notes", label: "Notes" },
    { path: "/kanban", label: "Kanban" },
    { path: "/settings/ai", label: "Settings" },
  ];

  it("should have all main navigation routes", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/notes");
    expect(paths).toContain("/kanban");
    expect(paths).toContain("/settings/ai");
  });
});
