// ═══════════════════════════════════════════════════════════════════════════════
// Sprint Icon (RefreshCw) E2E Tests — Worf
// ═══════════════════════════════════════════════════════════════════════════════
//
// Covers:
//   1. Creating a sprint-type project via the sidebar
//   2. Verifying the RefreshCw (cycle) icon is displayed for the sprint project
//   3. Verifying the Timer icon is NOT displayed for sprint project display
//
// Background:
//   The Timer icon was replaced with RefreshCw everywhere sprint-type projects
//   are displayed. This test validates that the change is reflected in the UI.
//
// Architecture notes:
//   - All clicks go through browser.execute() (macOS WKWebView)
//   - ProjectPage renders ProjectSidebar with board list
//   - Sprint-type boards should show RefreshCw icons
//   - Timer icon may still appear in the create dialog's type picker,
//     but should NOT appear on the sprint project page after creation
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
 * Check if a specific Lucide icon SVG is present in the page.
 * Lucide icons render as <svg> with class "lucide-{icon-name}".
 */
async function hasLucideIcon(iconName) {
  return await browser.execute((name) => {
    const icons = document.querySelectorAll(`svg.lucide-${name}`);
    return icons.length > 0;
  }, iconName);
}

/**
 * Count the number of specific Lucide icon SVGs present in the page.
 */
async function countLucideIcon(iconName) {
  return await browser.execute((name) => {
    const icons = document.querySelectorAll(`svg.lucide-${name}`);
    return icons.length;
  }, iconName);
}

/**
 * Click the sidebar's Projects nav button (index 2) and verify URL.
 */
async function clickProjectsNav() {
  await navigateToNavButton(2);
  await browser.pause(500);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Sprint icon (RefreshCw) display', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Test: Create a sprint-type project
  // ──────────────────────────────────────────────────────────────────────────
  it('should create a sprint project and display RefreshCw icon', async () => {
    // Navigate to the ProjectPage
    await navigateTo('/project');

    // Verify we're on /project
    let pathname = await getPathname();
    if (pathname !== '/project') {
      await clickProjectsNav();
      await browser.pause(500);
    }

    // Generate a unique project name to avoid collisions
    const projectName = `Sprint Icon Test ${Date.now()}`;

    // Click the "+" button in the ProjectSidebar to open the create dialog
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

    // Fill in the project name
    const nameInput = await $('input[placeholder="Project name..."]');
    await nameInput.waitForExist({ timeout: 3000 });
    await nameInput.setValue(projectName);
    await browser.pause(200);

    // Select "Sprint" type by clicking the Sprint button in the dialog
    // The type picker has two buttons: "Kanban" and "Sprint"
    await browser.execute(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Sprint') {
          btn.click();
          return;
        }
      }
    });
    await browser.pause(200);

    // Click the "Create" button (type="submit")
    const createBtn = await $('button[type="submit"]');
    await createBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(createBtn);

    // Wait for the backend to create the board and navigate to /project/:slug
    await browser.pause(1500);

    // Verify the URL now contains /project/ followed by a slug
    const url = await browser.getUrl();
    expect(url).toMatch(/\/project\/[a-zA-Z0-9_-]+/);

    // The "New Project" dialog should be closed
    const dialogClosed = await browser.execute(() => {
      return document.body.innerText.includes('New Project') === false;
    });
    expect(dialogClosed).toBe(true);

    // ── Icon assertions ──────────────────────────────────────────────────

    // The page should display RefreshCw icon(s) for the sprint project
    const hasRefreshCw = await hasLucideIcon('refresh-cw');
    expect(hasRefreshCw).toBe(true);

    // The page should NOT display the Timer icon for sprint project display.
    // Note: Timer may appear in the create dialog's type picker button,
    // but the dialog is now closed. The sprint project page itself
    // should have zero Timer icons.
    const hasTimer = await hasLucideIcon('timer');
    expect(hasTimer).toBe(false);

    // The page should display Columns3 icon(s) as well (tab bar etc.)
    const hasColumns3 = await hasLucideIcon('columns-3');
    expect(hasColumns3).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test: Multiple RefreshCw icons on the sprint project page
  // ──────────────────────────────────────────────────────────────────────────
  it('should have RefreshCw icon in both the tab bar and the project badge', async () => {
    // Navigate to /project and create a sprint project if needed
    await navigateTo('/project');

    let pathname = await getPathname();
    if (pathname !== '/project') {
      await clickProjectsNav();
      await browser.pause(500);
    }

    // Check if we're already on a sprint project page (from previous test)
    const currentUrl = await browser.getUrl();
    const isOnSprintProject = /\/project\/[a-zA-Z0-9_-]+$/.test(currentUrl);

    if (!isOnSprintProject) {
      // Create a sprint project
      const projectName = `Sprint Badge Test ${Date.now()}`;

      await browser.execute(() => {
        const aside = document.querySelector('aside');
        if (!aside) return;
        const buttons = aside.querySelectorAll('button');
        for (const btn of buttons) {
          const svg = btn.querySelector('svg.lucide-plus');
          if (svg) { btn.click(); return; }
        }
      });
      await browser.pause(500);

      const nameInput = await $('input[placeholder="Project name..."]');
      await nameInput.waitForExist({ timeout: 3000 });
      await nameInput.setValue(projectName);
      await browser.pause(200);

      await browser.execute(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === 'Sprint') { btn.click(); return; }
        }
      });
      await browser.pause(200);

      const createBtn = await $('button[type="submit"]');
      await createBtn.waitForExist({ timeout: 3000 });
      await jsClickElement(createBtn);
      await browser.pause(1500);
    }

    // Verify that the sprint project page has RefreshCw in the Sprint tab
    const tabHasRefreshCw = await browser.execute(() => {
      // Find the Sprint tab button (contains text "Sprint" but is a button)
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.trim() === 'Sprint' && btn.closest('[class*="flex"]')) {
          return btn.querySelector('svg.lucide-refresh-cw') !== null;
        }
      }
      return false;
    });
    expect(tabHasRefreshCw).toBe(true);

    // Verify that the project type badge (span with "Sprint" text) has RefreshCw
    const badgeHasRefreshCw = await browser.execute(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.tagName === 'SPAN' && el.textContent.trim() === 'Sprint') {
          // This should be the badge - check it has RefreshCw
          return el.querySelector('svg.lucide-refresh-cw') !== null;
        }
      }
      return false;
    });
    expect(badgeHasRefreshCw).toBe(true);

    // Verify the sidebar's sprint project item has RefreshCw
    const sidebarHasRefreshCw = await browser.execute(() => {
      const aside = document.querySelector('aside');
      if (!aside) return false;
      const projectNameEl = aside.querySelector('span.truncate');
      if (!projectNameEl) return false;
      // The parent button of the project item should have RefreshCw
      const parentButton = projectNameEl.closest('button');
      if (!parentButton) return false;
      return parentButton.querySelector('svg.lucide-refresh-cw') !== null;
    });
    expect(sidebarHasRefreshCw).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test: Timer icon is absent from sprint project display
  // ──────────────────────────────────────────────────────────────────────────
  it('should not show Timer icon anywhere on the sprint project page', async () => {
    // Navigate to a sprint project page
    const currentUrl = await browser.getUrl();
    const isOnSprintProject = /\/project\/[a-zA-Z0-9_-]+$/.test(currentUrl);

    if (!isOnSprintProject) {
      await navigateTo('/project');
      await browser.pause(500);

      // Click on the first sprint project in the sidebar
      const clicked = await browser.execute(() => {
        const aside = document.querySelector('aside');
        if (!aside) return false;
        const buttons = aside.querySelectorAll('button');
        for (const btn of buttons) {
          const svg = btn.querySelector('svg.lucide-refresh-cw');
          if (svg) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      // If no sprint project exists, create one first
      if (!clicked) {
        const projectName = `Timer Absence Test ${Date.now()}`;

        await browser.execute(() => {
          const aside = document.querySelector('aside');
          if (!aside) return;
          const buttons = aside.querySelectorAll('button');
          for (const btn of buttons) {
            const svg = btn.querySelector('svg.lucide-plus');
            if (svg) { btn.click(); return; }
          }
        });
        await browser.pause(500);

        const nameInput = await $('input[placeholder="Project name..."]');
        await nameInput.waitForExist({ timeout: 3000 });
        await nameInput.setValue(projectName);
        await browser.pause(200);

        await browser.execute(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent.trim() === 'Sprint') { btn.click(); return; }
          }
        });
        await browser.pause(200);

        const createBtn = await $('button[type="submit"]');
        await createBtn.waitForExist({ timeout: 3000 });
        await jsClickElement(createBtn);
        await browser.pause(1500);
      }
    }

    await browser.pause(500);

    // Verify the URL is a sprint project
    const finalUrl = await browser.getUrl();
    expect(finalUrl).toMatch(/\/project\/[a-zA-Z0-9_-]+/);

    // The sprint project page should have RefreshCw icons
    const refreshCwCount = await countLucideIcon('refresh-cw');
    expect(refreshCwCount).toBeGreaterThan(0);

    // The Timer icon should NOT be present on the sprint project page
    const timerCount = await countLucideIcon('timer');
    expect(timerCount).toBe(0);

    // The Columns3 icon should still be present (for the Board tab)
    const columns3Count = await countLucideIcon('columns-3');
    expect(columns3Count).toBeGreaterThan(0);
  });
});
