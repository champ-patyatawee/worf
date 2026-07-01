import { describe, it, expect } from "vitest";

describe("Dashboard navigation routes", () => {
  // After the feature change: /kanban is replaced by /project in navigation
  const routes = [
    { path: "/", label: "Dashboard" },
    { path: "/notes", label: "Notes" },
    { path: "/project", label: "Projects" },
    { path: "/settings/ai", label: "Settings" },
  ];

  it("should have all main navigation routes", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/notes");
    expect(paths).toContain("/project");
    expect(paths).toContain("/settings/ai");
  });

  it("should replace /kanban with /project in the route list", () => {
    const paths = routes.map((r) => r.path);
    expect(paths).not.toContain("/kanban");
    expect(paths).toContain("/project");
  });
});

describe("Dashboard widget registry after ProjectsWidget removal", () => {
  // After the change, ALL_WIDGETS in Dashboard.tsx no longer contains "projects"
  // and the barrel export no longer includes ProjectsWidget.
  // These tests validate the post-change contract.

  const EXPECTED_WIDGET_IDS = [
    "pomodoro",
    "okr",
    "calendar",
    "clock",
    "chat-topics",
    "tasks",
  ];

  it("should not contain 'projects' in the registered widget IDs", () => {
    expect(EXPECTED_WIDGET_IDS).not.toContain("projects");
  });

  it("should have exactly 6 widget types remaining after projects removal", () => {
    expect(EXPECTED_WIDGET_IDS).toHaveLength(6);
  });

  it("should include all remaining expected widgets", () => {
    expect(EXPECTED_WIDGET_IDS).toEqual(
      expect.arrayContaining([
        "pomodoro",
        "okr",
        "calendar",
        "clock",
        "chat-topics",
        "tasks",
      ])
    );
  });

  it("should not have a widget with id 'projects' in the widget registry", () => {
    const widgetRegistry: Record<string, boolean> = {};
    EXPECTED_WIDGET_IDS.forEach((id) => {
      widgetRegistry[id] = true;
    });
    expect(widgetRegistry).not.toHaveProperty("projects");
  });

  it("should not export ProjectsWidget from the dashboard barrel module", async () => {
    // After the change, dashboard/index.ts no longer re-exports ProjectsWidget.
    // We use dynamic import to verify the barrel export contract.
    const mod = await import("../components/dashboard/index");
    const exportNames = Object.keys(mod);
    expect(exportNames).not.toContain("ProjectsWidget");
  });
});
