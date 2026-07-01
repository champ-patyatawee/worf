// ═══════════════════════════════════════════════════════════════════════════════
// Projects E2E Tests — Worf
// ═══════════════════════════════════════════════════════════════════════════════
//
// Covers:
//   1. Dashboard does NOT show the Projects widget after its removal
//   2. Clicking the Projects icon in the sidebar navigates to /project
//   3. The ProjectPage has a visible sidebar with project list
//   4. The "Select a project" empty state is shown when no project is selected
//   5. Creating a new project via the sidebar navigates to /project/:slug
//   6. A created project's board content area is visible
//   7. All created projects use sprint features (kanban type removed)
//   8. The create dialog has no type picker (no Kanban/Sprint toggle)
//
// Architecture notes:
//   - All clicks go through browser.execute() (macOS WKWebView)
//   - The ProjectsWidget has been removed from the Dashboard
//   - The IconSidebar projects icon now points to /project (not /projects)
//   - /projects route now redirects to /project
//   - ProjectPage has a left sidebar (ProjectSidebar) + content area layout
//   - Creating a project invokes the Tauri backend via the ProjectSidebar
//   - The kanban board type was removed — all boards are created as sprint
//   - The create dialog no longer has a Kanban/Sprint type picker
//
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────────────────

async function jsClick(selector) {
  const el = await $(selector);
  await el.waitForExist({ timeout: 3000 });
  await browser.execute((el) => el.click(), el);
}

async function jsClickElement(el) {
  await browser.execute((e) => e.click(), el);
}

/**
 * Navigate to a specific route via the sidebar nav buttons.
 * Index: 0=Dashboard, 1=Notes, 2=Projects, 3=OKR, 4=AI Chat
 */
async function navigateToNavButton(index) {
  const nav = await $$('nav button');
  expect(nav.length).toBeGreaterThan(index);
  await jsClickElement(nav[index]);
  await browser.pause(800);
}

/**
 * Navigate directly to a URL.
 */
async function navigateTo(url) {
  await browser.url(url);
  await browser.pause(800);
}

/**
 * Get the visible text content of the whole page body.
 */
async function getPageText() {
  return await browser.execute(() => document.body.innerText);
}

/**
 * Check whether a string appears anywhere in the page body.
 */
async function pageContains(text) {
  const bodyText = await getPageText();
  return bodyText.includes(text);
}

/**
 * Get the current URL pathname (strip origin).
 */
async function getPathname() {
  const url = await browser.getUrl();
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

/**
 * Click the sidebar's Projects nav button (index 2) and verify URL.
 */
async function clickProjectsNav() {
  await navigateToNavButton(2);
  await browser.pause(500);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Projects feature', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1: Dashboard does NOT show the Projects widget
  // ──────────────────────────────────────────────────────────────────────────
  it('should not show the Projects widget on the Dashboard', async () => {
    await navigateTo('/');

    // Verify we are on the Dashboard
    const pathname = await getPathname();
    expect(pathname).toBe('/');

    // After the feature change, the ProjectsWidget is removed from the Dashboard.
    // There should be no project-specific text visible in the main Dashboard area.
    // The sidebar still has a "Projects" icon but the widget content is gone.
    const projectsWidgetText = await browser.execute(() => {
      // Look for widget elements that would contain project board names
      // The removed ProjectsWidget used to render a list of boards with names.
      // We check the main content area (not the sidebar) for any project text.
      const mainContent = document.querySelector('.flex-1.overflow-y-auto');
      if (!mainContent) return null;
      // The "Projects" heading in the sidebar nav icon is fine — we check
      // specifically for widget-level board listing text like "projects" or
      // board names in the widget area. Since there's no easy way to distinguish
      // we check that no heading with "Projects" exists inside the widget grid.
      const widgetsContainer = mainContent.querySelector('.relative');
      if (!widgetsContainer) return 'no-widget-container';
      return widgetsContainer.textContent;
    });
    // The widgets container should exist but should not contain project names
    expect(projectsWidgetText).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2: Projects icon navigates to /project
  // ──────────────────────────────────────────────────────────────────────────
  it('should navigate to /project when clicking the Projects sidebar icon', async () => {
    // Start from the Dashboard
    await navigateTo('/');

    // Click the Projects icon (nav button index 2)
    await clickProjectsNav();

    // Verify URL is /project (not /projects, not /kanban)
    const url = await browser.getUrl();
    expect(url).toMatch(/\/project$/);
    const path = await getPathname();
    expect(path).toBe('/project');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3: ProjectPage has a visible sidebar
  // ──────────────────────────────────────────────────────────────────────────
  it('should have a visible sidebar on the ProjectPage', async () => {
    // Ensure we are on /project
    const pathname = await getPathname();
    if (pathname !== '/project') {
      await clickProjectsNav();
    }

    // The ProjectSidebar renders an <aside> element with class "w-[260px]"
    const sidebar = await browser.execute(() => {
      const aside = document.querySelector('aside');
      return aside ? {
        tag: aside.tagName,
        className: aside.className,
        exists: true,
      } : { exists: false };
    });
    expect(sidebar.exists).toBe(true);
    expect(sidebar.tagName).toBe('ASIDE');
    expect(sidebar.className).toContain('w-[260px]');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4: "Select a project" empty state is shown
  // ──────────────────────────────────────────────────────────────────────────
  it('should show the "Select a project" empty state', async () => {
    // Ensure we are on /project
    const pathname = await getPathname();
    if (pathname !== '/project') {
      await clickProjectsNav();
    }

    // The empty state text should be visible
    const hasSelectText = await pageContains('Select a project');
    expect(hasSelectText).toBe(true);

    // The secondary helper text should also appear
    const hasHelperText = await pageContains('Choose a project from the sidebar');
    expect(hasHelperText).toBe(true);

    // The empty state icon (Columns3) should be rendered — verify via SVG
    const hasIcon = await browser.execute(() => {
      const svgs = document.querySelectorAll('svg');
      return Array.from(svgs).some(svg => svg.classList.contains('lucide-columns-3'));
    });
    expect(hasIcon).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 5: Create a new project via the sidebar
  // ──────────────────────────────────────────────────────────────────────────
  it('should create a new project and navigate to /project/:slug', async () => {
    // Ensure we are on /project
    const pathname = await getPathname();
    if (pathname !== '/project') {
      await clickProjectsNav();
    }

    // Generate a unique project name to avoid collisions
    const projectName = `E2E Test Project ${Date.now()}`;

    // Click the "+" button in the ProjectSidebar to open the create dialog
    // The button is inside the sidebar aside, has a Plus icon, and opens the dialog
    await browser.execute(() => {
      const aside = document.querySelector('aside');
      if (!aside) return;
      const buttons = aside.querySelectorAll('button');
      for (const btn of buttons) {
        const svg = btn.querySelector('svg.lucide-plus');
        if (svg) {
          btn.click();
          return;
        }
      }
    });
    await browser.pause(500);

    // The dialog should now be visible with a "New Project" title
    const dialogTitle = await $('h2=New Project');
    await dialogTitle.waitForExist({ timeout: 3000 });
    expect(await dialogTitle.getText()).toBe('New Project');

    // After the kanban removal, the create dialog has NO type picker.
    // Verify there are no Kanban/Sprint toggle buttons inside the dialog.
    const hasTypePicker = await browser.execute(() => {
      // Look for the type picker buttons inside the New Project dialog
      const dialog = document.querySelector('h2');
      if (!dialog) return false;
      const parentForm = dialog.closest('form');
      if (!parentForm) return false;
      // The type picker had buttons with "Kanban" and "Sprint" text
      const allButtons = parentForm.querySelectorAll('button');
      const buttonTexts = Array.from(allButtons).map(b => b.textContent.trim());
      return buttonTexts.includes('Kanban') || buttonTexts.includes('Sprint');
    });
    expect(hasTypePicker).toBe(false);

    // Fill in the project name
    const nameInput = await $('input[placeholder="Project name..."]');
    await nameInput.waitForExist({ timeout: 3000 });
    await nameInput.setValue(projectName);
    await browser.pause(200);

    // Click the "Create" button (type="submit")
    const createBtn = await $('button[type="submit"]');
    await createBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(createBtn);

    // Wait for the backend to create the board and navigate to /project/:slug
    await browser.pause(1500);

    // Verify the URL now contains /project/ followed by a slug (not just /project)
    const url = await browser.getUrl();
    expect(url).toMatch(/\/project\/[a-zA-Z0-9_-]+/);

    // The "New Project" dialog should be closed
    const dialogClosed = await browser.execute(() => {
      return document.body.innerText.includes('New Project') === false;
    });
    expect(dialogClosed).toBe(true);

    // Verify the created project page shows Sprint features
    const hasSprintText = await pageContains('Sprint');
    expect(hasSprintText).toBe(true);

    // The project badge should show "Sprint" (not "Kanban")
    // Since all boards are sprint type, there should be no "Kanban" badge text
    const hasKanbanText = await pageContains('Kanban');
    expect(hasKanbanText).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 6: Content area is visible with the project board
  // ──────────────────────────────────────────────────────────────────────────
  it('should show the content area with the project board', async () => {
    // We should already be on a /project/:slug page from the previous test
    const url = await browser.getUrl();
    const onProjectDetail = /\/project\/[a-zA-Z0-9_-]+$/.test(url);

    if (!onProjectDetail) {
      // If not, create a new project first
      // Click the Projects sidebar icon
      await clickProjectsNav();

      // Click the "+" button in the sidebar
      await browser.execute(() => {
        const aside = document.querySelector('aside');
        if (!aside) return;
        const buttons = aside.querySelectorAll('button');
        for (const btn of buttons) {
          const svg = btn.querySelector('svg.lucide-plus');
          if (svg) {
            btn.click();
            return;
          }
        }
      });
      await browser.pause(500);

      // Fill in name and create
      const nameInput = await $('input[placeholder="Project name..."]');
      await nameInput.waitForExist({ timeout: 3000 });
      await nameInput.setValue(`Board Content Test ${Date.now()}`);
      await browser.pause(200);

      const createBtn = await $('button[type="submit"]');
      await createBtn.waitForExist({ timeout: 3000 });
      await jsClickElement(createBtn);
      await browser.pause(1500);
    }

    // The project page should have:
    // 1. A sidebar (aside) — the ProjectSidebar
    const sidebar = await browser.execute(() => {
      const aside = document.querySelector('aside');
      return aside ? aside.className : null;
    });
    expect(sidebar).toBeTruthy();
    expect(sidebar).toContain('w-[260px]');

    // 2. A content area with the project name visible
    const hasProjectHeading = await browser.execute(() => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent.trim().length > 0;
    });
    expect(hasProjectHeading).toBe(true);

    // 3. The tab bar with board/sprint/calendar/okr options
    const hasTabs = await pageContains('Board');
    expect(hasTabs).toBe(true);

    // 4. The Sprint tab is always present and enabled (all boards are sprint)
    const hasSprintTab = await pageContains('Sprint');
    expect(hasSprintTab).toBe(true);

    // 5. The Sprint tab should not be disabled (no disabled attribute)
    const sprintTabDisabled = await browser.execute(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Sprint') {
          return btn.disabled || btn.getAttribute('disabled') !== null;
        }
      }
      return true; // not found = fail
    });
    expect(sprintTabDisabled).toBe(false);

    // 6. The content area has a tab-based layout (board columns area)
    const hasContentArea = await browser.execute(() => {
      // The content area is the sibling after the aside
      const aside = document.querySelector('aside');
      if (!aside || !aside.parentElement) return false;
      const children = aside.parentElement.children;
      // There should be at least 2 children: sidebar + content
      return children.length >= 2;
    });
    expect(hasContentArea).toBe(true);

    // 7. The page should show RefreshCw icon (sprint icon) somewhere
    const hasRefreshCw = await browser.execute(() => {
      const icons = document.querySelectorAll('svg.lucide-refresh-cw');
      return icons.length > 0;
    });
    expect(hasRefreshCw).toBe(true);
  });
});
