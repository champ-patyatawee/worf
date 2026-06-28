// ═══════════════════════════════════════════════════════════════════════════════
// Sprint (Scrum) E2E Tests — Worf
// ═══════════════════════════════════════════════════════════════════════════════
//
// Covers:
//   1. Create a sprint with name, goal, and date range
//   2. Backlog vs sprint view isolation (tasks are scope-correct)
//   3. Start and complete a sprint lifecycle
//   4. Multiple sprints management (create, select, switch)
//
// Architecture notes:
//   - All clicks go through browser.execute() (macOS WKWebView)
//   - SprintBar component renders a <Select> with sprint options + action buttons
//   - SprintCreateModal opens for name/goal/dates
//   - SprintCompleteDialog shows on completion
//   - Tasks are scoped to sprint via sprint_id (null = backlog)
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
 * Index: 0=Dashboard, 1=Notes, 2=Kanban, 3=AI Chat
 */
async function navigateToNavButton(index) {
  const nav = await $$('nav button');
  expect(nav.length).toBeGreaterThan(index);
  await jsClickElement(nav[index]);
  await browser.pause(800);
}

/**
 * Generate an ISO date string (YYYY-MM-DD) relative to today.
 */
function dateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Open the Sprint Create modal by clicking the "Create Sprint" button.
 */
async function openCreateSprintModal() {
  const createBtn = await $('button=Create Sprint');
  await createBtn.waitForExist({ timeout: 3000 });
  await jsClickElement(createBtn);
  await browser.pause(500);
}

/**
 * Fill in and submit the Sprint Create modal.
 */
async function createSprint(name, goal, startDate, endDate) {
  await openCreateSprintModal();

  // The modal title should be "Create Sprint"
  const titleEl = await $('h2');
  await titleEl.waitForExist({ timeout: 3000 });
  expect(await titleEl.getText()).toBe('Create Sprint');

  // Fill in sprint name (should be auto-filled as "Sprint N")
  const nameInput = await $('input[placeholder="Sprint name"]');
  await nameInput.waitForExist({ timeout: 3000 });
  await nameInput.clearValue();
  await nameInput.setValue(name);

  // Fill in goal
  const goalTextarea = await $('textarea[placeholder="Sprint goal (optional)"]');
  if (await goalTextarea.isExisting()) {
    await goalTextarea.setValue(goal);
  }

  // Fill in start date and end date
  const dateInputs = await $$('input[type="date"]');
  expect(dateInputs.length).toBeGreaterThanOrEqual(2);
  await dateInputs[0].setValue(startDate);
  await browser.pause(100);
  await dateInputs[1].setValue(endDate);
  await browser.pause(100);

  // Click Create button
  const submitBtn = await $('button[type="submit"]');
  await jsClickElement(submitBtn);
  await browser.pause(800);
}

/**
 * Get the text content of the SprintBar area to verify status and info.
 */
async function getSprintBarText() {
  return browser.execute(() => {
    // The SprintBar is a div with flex items gap-3 px-6 py-2.5 border-b-2
    const bars = document.querySelectorAll('.flex.items-center.gap-3');
    for (const bar of bars) {
      // SprintBar has specific content like "Backlog" or status indicators
      if (bar.textContent.includes('Backlog') || bar.textContent.includes('Planning') ||
          bar.textContent.includes('Active') || bar.textContent.includes('Create Sprint')) {
        return bar.textContent;
      }
    }
    return '';
  });
}

/**
 * Select a sprint from the SprintBar's dropdown by its name.
 */
async function selectSprint(sprintName) {
  // Click the sprint selector button (the Select trigger)
  await browser.execute((name) => {
    const bars = document.querySelectorAll('.flex.items-center.gap-3');
    for (const bar of bars) {
      if (bar.textContent.includes('Backlog') || bar.querySelector('svg.lucide-chevron-down')) {
        const trigger = bar.querySelector('button');
        if (trigger) { trigger.click(); return; }
      }
    }
  }, sprintName);
  await browser.pause(400);

  // Click the option in the popover
  await browser.execute((name) => {
    const buttons = document.querySelectorAll('[role="listbox"] button, [role="menu"] button, button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === name) {
        btn.click();
        return;
      }
    }
    // Fallback: find any visible popover content
    const popover = document.querySelector('[data-radix-popper-content-wrapper]');
    if (popover) {
      const items = popover.querySelectorAll('button');
      for (const item of items) {
        if (item.textContent.trim() === name) {
          item.click();
          return;
        }
      }
    }
  }, sprintName);
  await browser.pause(500);
}

/**
 * Get all visible task titles on the kanban board.
 */
async function getBoardTaskTitles() {
  return browser.execute(() => {
    const cards = document.querySelectorAll('div.cursor-grab');
    return Array.from(cards).map((c) => c.textContent.trim());
  });
}

/**
 * Set the sprint selector to "Backlog" (null sprint).
 */
async function selectBacklog() {
  await selectSprint('Backlog');
}

/**
 * Click the "Start Sprint" button in the SprintBar.
 */
async function clickStartSprint() {
  await browser.execute(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === 'Start Sprint') {
        btn.click();
        return;
      }
    }
  });
  await browser.pause(600);
}

/**
 * Click the "Complete Sprint" button in the SprintBar.
 */
async function clickCompleteSprint() {
  await browser.execute(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === 'Complete Sprint') {
        btn.click();
        return;
      }
    }
  });
  await browser.pause(500);
}

/**
 * Confirm the sprint completion dialog.
 */
async function confirmCompleteSprint() {
  await browser.execute(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === 'Complete' && btn.closest('[class*="fixed"]')) {
        btn.click();
        return;
      }
    }
  });
  await browser.pause(800);
}

/**
 * Create a task on the board with a given title.
 */
async function createTask(title) {
  const newTaskBtn = await $('button=New Task');
  await newTaskBtn.waitForExist({ timeout: 3000 });
  await jsClickElement(newTaskBtn);
  await browser.pause(400);

  const titleInput = await $('input[placeholder="Task title"]');
  await titleInput.waitForExist({ timeout: 3000 });
  await titleInput.setValue(title);
  await browser.pause(100);

  const submitBtn = await $('button[type="submit"]');
  await jsClickElement(submitBtn);
  await browser.pause(800);
}

/**
 * Get the status badge text/emoji from the SprintBar.
 */
async function getSprintStatusLabel() {
  return browser.execute(() => {
    const bars = document.querySelectorAll('.flex.items-center.gap-3');
    for (const bar of bars) {
      // Look for status indicator (🟡, 🟢, ⚪ with label)
      const spans = bar.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent === 'Planning' || span.textContent === 'Active' || span.textContent === 'Complete') {
          return span.textContent;
        }
      }
    }
    return null;
  });
}

/**
 * Navigate to a kanban board by clicking the first board link in sidebar.
 */
async function navigateIntoFirstBoard() {
  const boardLink = await $('a[href^="/kanban/"]');
  if (await boardLink.isExisting()) {
    await jsClickElement(boardLink);
    await browser.pause(1000);
  }
  // Wait for board header to confirm we're on a board
  const boardHeader = await $('h1.font-extrabold');
  await boardHeader.waitForExist({ timeout: 3000 });
}


// ── Tests ────────────────────────────────────────────────────────────────────

describe('Sprints (Scrum)', () => {

  // ────────────────────────────────────────────────────────────────────────────
  // Setup: Navigate to Kanban and open a board
  // ────────────────────────────────────────────────────────────────────────────
  it('should navigate to kanban and open a board', async () => {
    await navigateToNavButton(2);
    expect(await browser.getUrl()).toMatch(/\/kanban/);

    // Navigate into a board if we're at the /kanban listing
    await navigateIntoFirstBoard();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 1: Create a sprint
  // ────────────────────────────────────────────────────────────────────────────
  it('should create a sprint with name, goal, and date range', async () => {
    const today = new Date();
    const startDate = dateOffset(0);    // today
    const endDate = dateOffset(13);     // 2 weeks

    await createSprint('Sprint 1', 'Ship it', startDate, endDate);

    // Verify the sprint bar now shows the sprint name and "Planning" status
    const barText = await getSprintBarText();
    expect(barText).toContain('Sprint 1');

    const status = await getSprintStatusLabel();
    expect(status).toBe('Planning');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 2: Backlog vs Sprint view isolation
  // ────────────────────────────────────────────────────────────────────────────
  it('should isolate tasks between backlog and sprint views', async () => {
    // We should already be viewing "Sprint 1" (it was auto-selected after creation)

    // Create a task in the sprint
    await createTask('Sprint Task A');
    let tasks = await getBoardTaskTitles();
    const hasSprintTask = tasks.some((t) => t.includes('Sprint Task A'));
    expect(hasSprintTask).toBe(true);

    // Switch to Backlog view
    await selectBacklog();
    await browser.pause(500);

    // Verify the sprint task is NOT visible in backlog
    tasks = await getBoardTaskTitles();
    const sprintTaskInBacklog = tasks.some((t) => t.includes('Sprint Task A'));
    expect(sprintTaskInBacklog).toBe(false);

    // Create a task in backlog view
    await createTask('Backlog Task B');
    tasks = await getBoardTaskTitles();
    const hasBacklogTask = tasks.some((t) => t.includes('Backlog Task B'));
    expect(hasBacklogTask).toBe(true);

    // Switch back to sprint view
    await selectSprint('Sprint 1');
    await browser.pause(500);

    // Verify the backlog task is NOT visible in the sprint
    tasks = await getBoardTaskTitles();
    const backlogTaskInSprint = tasks.some((t) => t.includes('Backlog Task B'));
    expect(backlogTaskInSprint).toBe(false);

    // But the sprint task should still be there
    const sprintTaskStillThere = tasks.some((t) => t.includes('Sprint Task A'));
    expect(sprintTaskStillThere).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 3: Start and complete a sprint
  // ────────────────────────────────────────────────────────────────────────────
  it('should start and complete a sprint lifecycle', async () => {
    // Make sure Sprint 1 is selected
    await selectSprint('Sprint 1');
    await browser.pause(300);

    // Start the sprint
    await clickStartSprint();
    await browser.pause(500);

    // Verify the status badge changed to "active" (green)
    const statusAfterStart = await getSprintStatusLabel();
    expect(statusAfterStart).toBe('Active');

    // Create a task in this active sprint
    await createTask('Sprint Completion Task');
    await browser.pause(300);

    // Complete the sprint
    await clickCompleteSprint();
    await browser.pause(400);

    // Confirm the completion dialog
    await confirmCompleteSprint();
    await browser.pause(800);

    // After completion, we should be back to backlog view
    const barText = await getSprintBarText();
    expect(barText).toContain('Backlog');

    // The task should have moved to backlog (incomplete tasks go to backlog)
    const tasks = await getBoardTaskTitles();
    const movedToBacklog = tasks.some((t) => t.includes('Sprint Completion Task'));
    expect(movedToBacklog).toBe(true);

    // Verify the sprint status changed to "complete" when we select it
    await selectSprint('Sprint 1');
    await browser.pause(400);
    const completedStatus = await getSprintStatusLabel();
    expect(completedStatus).toBe('Complete');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 4: Multiple sprints
  // ────────────────────────────────────────────────────────────────────────────
  it('should manage multiple sprints with switching', async () => {
    const startDate = dateOffset(14);   // 2 weeks from now
    const endDate = dateOffset(28);     // 4 weeks from now

    // Switch to backlog first
    await selectBacklog();
    await browser.pause(300);

    // Create Sprint 2
    await createSprint('Sprint 2', 'Second iteration', startDate, endDate);
    await browser.pause(300);

    // Create Sprint 3
    await createSprint('Sprint 3', 'Final push', dateOffset(30), dateOffset(44));
    await browser.pause(300);

    // Verify the sprint selector shows all sprint options
    // Open the dropdown and check options
    await browser.execute(() => {
      const bars = document.querySelectorAll('.flex.items-center.gap-3');
      for (const bar of bars) {
        const trigger = bar.querySelector('button');
        if (trigger && (bar.textContent.includes('Sprint') || bar.textContent.includes('Backlog'))) {
          trigger.click();
          return;
        }
      }
    });
    await browser.pause(400);

    const dropdownOptions = await browser.execute(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popover) {
        // Fallback: find any visible menu/listbox
        const menus = document.querySelectorAll('[role="listbox"], [role="menu"]');
        if (menus.length > 0) return Array.from(menus[0].querySelectorAll('button')).map(b => b.textContent.trim());
        return [];
      }
      return Array.from(popover.querySelectorAll('button')).map((b) => b.textContent.trim());
    });

    expect(dropdownOptions).toContain('Backlog');
    expect(dropdownOptions).toContain('Sprint 1');
    expect(dropdownOptions).toContain('Sprint 2');
    expect(dropdownOptions).toContain('Sprint 3');

    // Dismiss the dropdown by clicking elsewhere
    await jsClick('h1.font-extrabold');
    await browser.pause(300);

    // Switch between sprints
    await selectSprint('Sprint 2');
    await browser.pause(400);
    let barText = await getSprintBarText();
    expect(barText).toContain('Sprint 2');

    await selectSprint('Sprint 3');
    await browser.pause(400);
    barText = await getSprintBarText();
    expect(barText).toContain('Sprint 3');

    // Switch back to Sprint 1
    await selectSprint('Sprint 1');
    await browser.pause(400);
    barText = await getSprintBarText();
    expect(barText).toContain('Sprint 1');
  });
});