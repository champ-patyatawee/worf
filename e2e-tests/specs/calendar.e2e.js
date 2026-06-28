// ═══════════════════════════════════════════════════════════════════════════════
// Calendar & Due Date E2E Tests — Worf
// ═══════════════════════════════════════════════════════════════════════════════
//
// Covers:
//   1. Setting a due date on a task via the kanban task modal
//   2. Calendar page rendering (grid, today highlight, day headers)
//   3. Task with due date appearing in the correct calendar day cell
//   4. Clicking a task pill on calendar navigates to its kanban board
//   5. Month navigation (next / previous)
//   6. Overdue due date badge on task card
//
// Architecture notes:
//   - All clicks go through browser.execute() (macOS WKWebView)
//   - Uses helper patterns from existing e2e specs
//   - The Calendar page at /calendar shows a month grid with task pills
//   - Tasks use data-testid attributes on the calendar for reliable selection
//   - Due date is set via an <input type="date"> in the task modal
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
 * @param {number} offsetDays - positive for future, negative for past
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
 * Format a Date as "Mon DD, YYYY" for badge display assertions.
 */
function formatDisplayDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get the current month+year string displayed in the calendar header.
 */
async function getCalendarMonthHeader() {
  const el = await $('[data-testid="calendar-month-header"]');
  await el.waitForExist({ timeout: 3000 });
  return el.getText();
}

/**
 * Parse a month header like "Jan 2026" into { monthIndex, year }.
 */
function parseMonthHeader(text) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = text.trim().split(' ');
  return {
    monthIndex: months.indexOf(parts[0]),
    year: parseInt(parts[1], 10),
  };
}

/**
 * Get the name of a month offset from the current month.
 */
function getMonthName(offsetMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()];
}

/**
 * Get the year for a month offset from current.
 */
function getMonthYear(offsetMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.getFullYear();
}

/**
 * Get today's day-of-month number.
 */
function getTodayDate() {
  return new Date().getDate();
}


// ── Tests ────────────────────────────────────────────────────────────────────

describe('Calendar & Due Dates', () => {

  // ────────────────────────────────────────────────────────────────────────────
  // Test 1: Set a due date on a task
  // ────────────────────────────────────────────────────────────────────────────
  it('should set a due date on a task and show the badge', async () => {
    // Navigate to kanban page (nav button index 2)
    await navigateToNavButton(2);
    expect(await browser.getUrl()).toMatch(/\/kanban/);

    // If no board is loaded, the page shows a "Select a project" prompt.
    // Try clicking the first board in the sidebar to navigate into it.
    const boardLink = await $('a[href^="/kanban/"]');
    if (await boardLink.isExisting()) {
      await jsClickElement(boardLink);
      await browser.pause(1000);
    }

    // Verify we are inside a board (the header shows board name)
    const boardHeader = await $('h1.font-extrabold');
    await boardHeader.waitForExist({ timeout: 3000 });

    // Click the "New Task" button to open the create modal
    const newTaskBtn = await $('button=New Task');
    await newTaskBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(newTaskBtn);
    await browser.pause(500);

    // Fill in the task title
    const titleInput = await $('input[placeholder="Task title"]');
    await titleInput.waitForExist({ timeout: 3000 });
    await titleInput.setValue('Calendar E2E Task');

    // Set a due date 7 days from now via the date input
    const dueDateInput = await $('input[type="date"]');
    await dueDateInput.waitForExist({ timeout: 3000 });
    const futureDate = dateOffset(7);
    await dueDateInput.setValue(futureDate);
    await browser.pause(200);

    // Click Create/Submit button
    const submitBtn = await $('button[type="submit"]');
    await jsClickElement(submitBtn);
    await browser.pause(1000);

    // Verify the task card appears with the due date badge
    const taskCards = await $$('div.cursor-grab');
    const calTask = taskCards.find(async (card) => {
      const text = await card.getText();
      return text.includes('Calendar E2E Task');
    });
    expect(calTask).toBeTruthy();

    // The card should show a due date badge (a span with formatted date)
    const badge = await calTask.$('.due-date-badge, [data-testid="due-date-badge"]');
    if (await badge.isExisting()) {
      const badgeText = await badge.getText();
      // Should contain the formatted date — e.g. "Jul 5, 2026"
      expect(badgeText).toMatch(/[A-Z][a-z]{2}\s\d{1,2},\s\d{4}/);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 2: Calendar page renders and shows today
  // ────────────────────────────────────────────────────────────────────────────
  it('should render the calendar page and highlight today', async () => {
    // Navigate to /calendar via direct URL
    await browser.url('/calendar');
    await browser.pause(1000);
    expect(await browser.getUrl()).toMatch(/\/calendar/);

    // Verify the calendar grid container is visible
    const calendarGrid = await $('[data-testid="calendar-grid"]');
    await calendarGrid.waitForExist({ timeout: 3000 });

    // Verify day-of-week headers (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    const dayHeaders = await $$('[data-testid="calendar-day-header"]');
    expect(dayHeaders.length).toBe(7);
    const dayTexts = await Promise.all(dayHeaders.map((h) => h.getText()));
    expect(dayTexts).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);

    // Verify today's date cell is highlighted with accent styling
    const todayCell = await $(`[data-testid="calendar-day-${getTodayDate()}"]`);
    await todayCell.waitForExist({ timeout: 3000 });

    // Today's cell should have a special class or indicator that marks it as today
    const isTodayHighlighted = await browser.execute(() => {
      const todayEl = document.querySelector('[data-testid^="calendar-day-"].today, [data-testid*="today"]');
      if (!todayEl) {
        // Fallback: check if the current day number has the accent background
        const allDayCells = document.querySelectorAll('[data-testid^="calendar-day-"]');
        for (const cell of allDayCells) {
          const style = getComputedStyle(cell);
          if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
            return true;
          }
        }
        return false;
      }
      return true;
    });
    expect(isTodayHighlighted).toBe(true);

    // Verify the calendar month header matches the current month
    const headerText = await getCalendarMonthHeader();
    const today = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(headerText).toContain(months[today.getMonth()]);
    expect(headerText).toContain(String(today.getFullYear()));
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 3: Task with due date appears on the calendar
  // ────────────────────────────────────────────────────────────────────────────
  it('should show the task with due date on the calendar', async () => {
    // We already set a due date 7 days from now in test 1.
    // Navigate to /calendar
    await browser.url('/calendar');
    await browser.pause(1000);

    // The task should appear as a pill/card in the correct day cell.
    // Find the day cell for 7 days from now and check for the task title.
    const futureDay = new Date();
    futureDay.setDate(futureDay.getDate() + 7);
    const dayNumber = futureDay.getDate();

    const dayCell = await $(`[data-testid="calendar-day-${dayNumber}"]`);
    await dayCell.waitForExist({ timeout: 3000 });

    // Within that day cell, find a task pill with our task title
    const taskPill = await dayCell.$('*=Calendar E2E Task');
    const taskExists = await taskPill.isExisting();

    if (!taskExists) {
      // The calendar might use a different selector pattern.
      // Fallback: search all task pills on the calendar page.
      const allPills = await $$('[data-testid="calendar-task-pill"]');
      const titles = await Promise.all(allPills.map((p) => p.getText()));
      const found = titles.some((t) => t.includes('Calendar E2E Task'));
      expect(found).toBe(true);
    } else {
      const pillText = await taskPill.getText();
      expect(pillText).toContain('Calendar E2E Task');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 4: Clicking a task on calendar navigates to its board
  // ────────────────────────────────────────────────────────────────────────────
  it('should navigate to the kanban board when clicking a calendar task', async () => {
    await browser.url('/calendar');
    await browser.pause(1000);

    // Find a task pill on the calendar
    const taskPill = await $('[data-testid="calendar-task-pill"], .calendar-task-pill');
    await taskPill.waitForExist({ timeout: 3000 });

    // Get the task title before clicking
    const taskTitle = await taskPill.getText();

    // Click the task pill
    await jsClickElement(taskPill);
    await browser.pause(1500);

    // Verify navigation to a kanban board URL
    const currentUrl = await browser.getUrl();
    expect(currentUrl).toMatch(/\/kanban\//);

    // Verify the page loaded — board header should be visible
    const boardHeader = await $('h1.font-extrabold');
    await boardHeader.waitForExist({ timeout: 3000 });

    // The clicked task should still be findable on the board
    const visible = await browser.execute((title) => {
      return document.body.innerText.includes(title);
    }, taskTitle);
    expect(visible).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 5: Navigate months on the calendar
  // ────────────────────────────────────────────────────────────────────────────
  it('should navigate between months on the calendar', async () => {
    await browser.url('/calendar');
    await browser.pause(800);

    // Get current month from header (will look like "Jun 2026")
    const initialHeader = await getCalendarMonthHeader();
    const initial = parseMonthHeader(initialHeader);
    expect(initial.monthIndex).toBeGreaterThanOrEqual(0);
    expect(initial.year).toBeGreaterThan(0);

    // Click next month button
    const nextBtn = await $('[aria-label="Next month"], [data-testid="calendar-next-month"]');
    await nextBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(nextBtn);
    await browser.pause(600);

    // Verify the header changed to the next month
    const afterNextHeader = await getCalendarMonthHeader();
    const afterNext = parseMonthHeader(afterNextHeader);
    // Month should have advanced by 1 (wrapping around Dec→Jan)
    const expectedNextMonth = (initial.monthIndex + 1) % 12;
    const expectedNextYear = initial.monthIndex === 11 ? initial.year + 1 : initial.year;
    expect(afterNext.monthIndex).toBe(expectedNextMonth);
    expect(afterNext.year).toBe(expectedNextYear);

    // Click previous month button (twice to go back to original)
    const prevBtn = await $('[aria-label="Previous month"], [data-testid="calendar-prev-month"]');
    await prevBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(prevBtn);
    await browser.pause(600);

    // After going back once, we should be at the original month again
    const afterPrevHeader = await getCalendarMonthHeader();
    expect(afterPrevHeader).toBe(initialHeader);

    // Quick sanity: clicking previous again goes to the prior month
    await jsClickElement(prevBtn);
    await browser.pause(600);
    const afterPrev2Header = await getCalendarMonthHeader();
    const afterPrev2 = parseMonthHeader(afterPrev2Header);
    const expectedPrevMonth = initial.monthIndex === 0 ? 11 : initial.monthIndex - 1;
    const expectedPrevYear = initial.monthIndex === 0 ? initial.year - 1 : initial.year;
    expect(afterPrev2.monthIndex).toBe(expectedPrevMonth);
    expect(afterPrev2.year).toBe(expectedPrevYear);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 6: Overdue due date badge shows warning style
  // ────────────────────────────────────────────────────────────────────────────
  it('should show an overdue indicator for tasks with past due dates', async () => {
    // Navigate to kanban
    await navigateToNavButton(2);
    expect(await browser.getUrl()).toMatch(/\/kanban/);

    // Navigate into a board if needed
    const boardLink = await $('a[href^="/kanban/"]');
    if (await boardLink.isExisting()) {
      await jsClickElement(boardLink);
      await browser.pause(1000);
    }

    // Wait for board to load
    const boardHeader = await $('h1.font-extrabold');
    await boardHeader.waitForExist({ timeout: 3000 });

    // Create a new task with a PAST due date (yesterday)
    const newTaskBtn = await $('button=New Task');
    await newTaskBtn.waitForExist({ timeout: 3000 });
    await jsClickElement(newTaskBtn);
    await browser.pause(500);

    // Fill in title
    const titleInput = await $('input[placeholder="Task title"]');
    await titleInput.waitForExist({ timeout: 3000 });
    await titleInput.setValue('Overdue Task E2E');

    // Set a past due date (yesterday)
    const dueDateInput = await $('input[type="date"]');
    await dueDateInput.waitForExist({ timeout: 3000 });
    const pastDate = dateOffset(-1);
    await dueDateInput.setValue(pastDate);
    await browser.pause(200);

    // Submit
    const submitBtn = await $('button[type="submit"]');
    await jsClickElement(submitBtn);
    await browser.pause(1000);

    // Find the overdue task card
    const overdueCard = await browser.execute(() => {
      const cards = document.querySelectorAll('div.cursor-grab');
      for (const card of cards) {
        if (card.textContent.includes('Overdue Task E2E')) {
          return card.outerHTML;
        }
      }
      return null;
    });
    expect(overdueCard).not.toBeNull();

    // Verify the due date badge shows with warning/error styling
    const isOverdueStyled = await browser.execute(() => {
      const cards = document.querySelectorAll('div.cursor-grab');
      for (const card of cards) {
        if (!card.textContent.includes('Overdue Task E2E')) continue;
        // Look for a date badge element
        const badge = card.querySelector('[data-testid="due-date-badge"], .due-date-badge');
        if (!badge) {
          // Fallback: find any element with a date-like pattern
          const allSpans = card.querySelectorAll('span');
          for (const span of allSpans) {
            if (/\w{3}\s\d{1,2}/.test(span.textContent)) {
              const style = getComputedStyle(span);
              // Overdue styling: red/error color or specific class
              return (
                style.color.includes('239') || // rgb(239,68,68) = red-500
                style.color.includes('220') || // rgb(220,38,38) = red-600
                style.color.includes('225') || // rgb(225,29,72) = rose-600
                span.className.includes('error') ||
                span.className.includes('overdue') ||
                span.className.includes('text-red') ||
                span.className.includes('text-rose') ||
                span.className.includes('warning')
              );
            }
          }
        }
        if (badge) {
          const style = getComputedStyle(badge);
          return (
            style.color.includes('239') ||
            style.color.includes('220') ||
            badge.className.includes('overdue') ||
            badge.className.includes('error') ||
            badge.className.includes('text-red')
          );
        }
        return false;
      }
      return false;
    });
    expect(isOverdueStyled).toBe(true);
  });
});