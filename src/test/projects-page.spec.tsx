import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock Tauri invoke — used by ProjectPage, ProjectSidebar, and child components
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

// Mock terminal store — used by IconSidebar
vi.mock("../stores/terminalStore", () => ({
  terminalStore: {
    subscribe: vi.fn(() => vi.fn()),
    toggle: vi.fn(),
    state: {
      isOpen: false,
      terminalMode: "overlay",
    },
  },
}));

// Mock heavy Kanban / Sprint child components so they don't need deep deps
vi.mock("../components/kanban/KanbanColumn", () => ({
  KanbanColumn: () => <div data-testid="kanban-column" />,
}));
vi.mock("../components/kanban/KanbanBacklog", () => ({
  KanbanBacklog: () => <div data-testid="kanban-backlog" />,
}));
vi.mock("../components/kanban/KanbanTaskModal", () => ({
  KanbanTaskModal: () => <div data-testid="kanban-task-modal" />,
}));
vi.mock("../components/kanban/SprintBar", () => ({
  SprintBar: () => <div data-testid="sprint-bar" />,
}));
vi.mock("../components/kanban/SprintCreateModal", () => ({
  SprintCreateModal: () => <div data-testid="sprint-create-modal" />,
}));
vi.mock("../components/kanban/SprintReviewDialog", () => ({
  SprintReviewDialog: () => <div data-testid="sprint-review-dialog" />,
}));
vi.mock("../components/kanban/SprintCompleteDialog", () => ({
  SprintCompleteDialog: () => <div data-testid="sprint-complete-dialog" />,
}));
vi.mock("../components/kanban/CalendarView", () => ({
  CalendarView: () => <div data-testid="calendar-view" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Renders the ProjectPage with router context at the given route */
function renderProjectPage(initialRoute = "/project") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/project" element={<ProjectPage />} />
        <Route path="/project/:boardId" element={<ProjectPage />} />
        <Route
          path="/projects"
          element={<Navigate to="/project" replace />}
        />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );
}

/** Exposes the current location pathname for assertions */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

/** Renders IconSidebar inside a router context */
function renderIconSidebar(initialRoute = "/") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<div>Dashboard Page</div>} />
        <Route path="/project" element={<div>Project Page</div>} />
        <Route path="/notes" element={<div>Notes Page</div>} />
      </Routes>
      {/* We render IconSidebar inside the MemoryRouter but outside Routes
          so it can navigate but won't conflict with route elements */}
      <IconSidebarWrapper />
      <LocationDisplay />
    </MemoryRouter>
  );
}

function IconSidebarWrapper(): JSX.Element {
  return <IconSidebar />;
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

// ── Imports (after mocks) ────────────────────────────────────────────────────

// These come AFTER vi.mock calls; vitest hoists vi.mock above imports
import { ProjectPage } from "../pages/ProjectPage";
import { IconSidebar } from "../components/layout/IconSidebar";
import { invoke } from "@tauri-apps/api/core";

// ── Tests: IconSidebar navigation ─────────────────────────────────────────────

describe("IconSidebar navigation", () => {
  it("should navigate to /project when clicking the Projects icon", () => {
    renderIconSidebar("/");

    // Find the Projects button by aria-label
    const projectsBtn = screen.getByRole("button", { name: /projects/i });
    expect(projectsBtn).toBeTruthy();

    fireEvent.click(projectsBtn);

    // After clicking, the URL should be /project
    const locationDisplay = screen.getByTestId("location-display");
    expect(locationDisplay.textContent).toBe("/project");
  });

  it("should not navigate to /projects when clicking the Projects icon", () => {
    renderIconSidebar("/");

    const projectsBtn = screen.getByRole("button", { name: /projects/i });
    fireEvent.click(projectsBtn);

    const locationDisplay = screen.getByTestId("location-display");
    expect(locationDisplay.textContent).not.toBe("/projects");
    expect(locationDisplay.textContent).toBe("/project");
  });
});

// ── Tests: Route redirect ─────────────────────────────────────────────────────

describe("Route redirect /projects → /project", () => {
  it("should redirect /projects to /project", () => {
    renderProjectPage("/projects");

    const locationDisplay = screen.getByTestId("location-display");
    expect(locationDisplay.textContent).toBe("/project");
  });

  it("should render the ProjectPage after redirect from /projects", () => {
    renderProjectPage("/projects");

    // After redirect, the ProjectPage empty state should be visible
    expect(screen.getByText("Select a project")).toBeTruthy();
  });
});

// ── Tests: ProjectPage rendering ──────────────────────────────────────────────

describe("ProjectPage rendering", () => {
  it("should render a ProjectSidebar when loaded at /project", () => {
    renderProjectPage("/project");

    // The ProjectSidebar renders an aside element with class w-[260px]
    const sidebar = document.querySelector("aside");
    expect(sidebar).toBeTruthy();
  });

  it("should show 'Select a project' message when no boardId is provided", () => {
    renderProjectPage("/project");

    expect(screen.getByText("Select a project")).toBeTruthy();
    expect(screen.getByText("Choose a project from the sidebar")).toBeTruthy();
  });

  it("should have a left sidebar with class containing 'w-[260px]'", () => {
    renderProjectPage("/project");

    // The ProjectSidebar renders an <aside> with className "w-[260px] ..."
    const aside = document.querySelector("aside");
    expect(aside).toBeTruthy();
    expect(aside!.className).toContain("w-[260px]");
  });

  it("should render the sidebar before the content area", () => {
    renderProjectPage("/project");

    const sidebar = document.querySelector("aside");
    const container = sidebar?.closest(".flex-1.flex");

    // The ProjectPage layout is: sidebar (aside) first, then content area
    const firstChild = container?.firstElementChild;
    expect(firstChild?.tagName.toLowerCase()).toBe("aside");
  });

  it("should not render project board content when no boardId is selected", () => {
    renderProjectPage("/project");

    // The board-specific elements (like KanbanColumn, New Task button) should not exist
    expect(screen.queryByText("New Task")).toBeNull();
    expect(screen.queryByText("To Do")).toBeNull();
  });
});

// ── Tests: Sprint icon (RefreshCw) display ────────────────────────────────────

/**
 * Helper: set up the invoke mock to return a sprint-type board.
 */
function mockSprintBoard() {
  vi.mocked(invoke).mockImplementation(async (cmd: string, _args?: any) => {
    if (cmd === "get_board") {
      return {
        id: "b1",
        name: "Sprint Project",
        slug: "sprint-board",
        board_type: "sprint" as const,
        tasks: [],
        description: null,
      };
    }
    if (cmd === "list_boards") {
      return [{ id: "b1", name: "Sprint Project", slug: "sprint-board", board_type: "sprint" }];
    }
    if (cmd === "list_sprints") return [];
    if (cmd === "get_objectives_for_board") throw new Error("No linked objective");
    return [];
  });
}

describe("Sprint icon (RefreshCw) display", () => {
  beforeEach(() => {
    mockSprintBoard();
  });

  afterEach(() => {
    vi.mocked(invoke).mockResolvedValue([]);
  });

  // ── Sprint tab icon ───────────────────────────────────────────────────────

  it("should display RefreshCw icon on the Sprint tab button", () => {
    renderProjectPage("/project/sprint-board");

    const sprintTab = screen.getByRole("button", { name: /sprint/i });
    expect(sprintTab).toBeTruthy();

    // The Sprint tab icon should be RefreshCw (lucide-refresh-cw)
    const refreshCwIcon = sprintTab.querySelector("svg.lucide-refresh-cw");
    expect(refreshCwIcon).toBeTruthy();

    // The Sprint tab should NOT have a Timer or Columns3 icon
    expect(sprintTab.querySelector("svg.lucide-timer")).toBeNull();
    expect(sprintTab.querySelector("svg.lucide-columns3")).toBeNull();
  });

  // ── Sprint badge icon ─────────────────────────────────────────────────────

  it("should display RefreshCw icon in the project type badge for sprint boards", async () => {
    renderProjectPage("/project/sprint-board");

    await waitFor(() => {
      // The badge is a span that contains the text "Sprint" (not inside a button/tab)
      const allSprintText = screen.getAllByText("Sprint");
      const badgeSpan = allSprintText.find((el) => el.tagName === "SPAN");
      expect(badgeSpan).toBeTruthy();

      // The badge should contain RefreshCw icon
      const refreshCwIcon = badgeSpan!.querySelector("svg.lucide-refresh-cw");
      expect(refreshCwIcon).toBeTruthy();

      // The badge should NOT contain Timer or Columns3
      expect(badgeSpan!.querySelector("svg.lucide-timer")).toBeNull();
      expect(badgeSpan!.querySelector("svg.lucide-columns3")).toBeNull();
    });
  });

  // ── Sidebar sprint item icon ──────────────────────────────────────────────

  it("should display RefreshCw icon in sidebar for sprint-type project", async () => {
    renderProjectPage("/project/sprint-board");

    await waitFor(() => {
      const sidebar = document.querySelector("aside");
      expect(sidebar).toBeTruthy();

      // The sidebar should have at least one RefreshCw icon for the sprint project item
      const refreshCwInSidebar = sidebar!.querySelector("svg.lucide-refresh-cw");
      expect(refreshCwInSidebar).toBeTruthy();
    });
  });

  // ── Sprint tab always enabled ──────────────────────────────────────────

  it("should have the Sprint tab always enabled (no disabled state)", async () => {
    renderProjectPage("/project/sprint-board");

    await waitFor(() => {
      // Find the Sprint tab button — there are multiple buttons with "sprint" text
      // (sidebar project items, tab buttons), so we use getAllByRole and filter
      // for the tab button which has exactly "Sprint" text content (no extra text)
      const allButtons = screen.getAllByRole("button");
      const sprintTabButtons = allButtons.filter(
        (btn) => btn.textContent?.trim() === "Sprint"
      );
      expect(sprintTabButtons.length).toBeGreaterThanOrEqual(1);
      const sprintTab = sprintTabButtons[0];
      expect(sprintTab).toBeTruthy();

      // The Sprint tab should NOT be disabled (all boards are sprint type)
      expect(sprintTab).not.toBeDisabled();

      // The Sprint tab should NOT have the disabled class styling
      expect(sprintTab.className).not.toContain("opacity-40");
      expect(sprintTab.className).not.toContain("cursor-not-allowed");
    });
  });
});
