// ═══════════════════════════════════════════════════════════════════════════════
// Note Editing — E2E Typing & Persistence Tests
// ═══════════════════════════════════════════════════════════════════════════════
//
// What this tests:
//   - Create a new note from the note page
//   - Type multi-line content via JavaScript (bypasses WKWebView keyboard bug)
//   - Verify every typed character renders in the editor
//   - Navigate away and back to confirm content persists after save
//   - Create a second note and type different content (no cross-contamination)
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

async function getSidebarText() {
  const asides = await $$('aside');
  return asides.length >= 2 ? asides[1].getText() : '';
}

async function clickNoteByTitle(title) {
  return await browser.execute((t) => {
    const sidebar = document.querySelectorAll('aside')[1];
    if (!sidebar) return false;
    const allBtns = sidebar.querySelectorAll('button');
    for (const btn of allBtns) {
      const spans = btn.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === t) { btn.click(); return true; }
      }
    }
    return false;
  }, title);
}

/**
 * Type text into the note textarea via JavaScript.
 * The textarea has placeholder "Start writing in Markdown..."
 */
async function typeInEditor(text) {
  await browser.execute((t) => {
    const ta = document.querySelector('textarea');
    if (!ta) return;
    // Focus
    ta.focus();
    // Set the value via the native input setter so React picks it up
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeSetter.call(ta, t);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // Also dispatch a change event for good measure
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }, text);
}

/**
 * Get the current value of the note textarea.
 */
async function getEditorValue() {
  return await browser.execute(() => {
    const ta = document.querySelector('textarea');
    return ta ? ta.value : '';
  });
}

/**
 * Navigate to the Notes page (second nav button).
 */
async function navigateToNotes() {
  const nav = await $$('nav button');
  expect(nav.length).toBeGreaterThanOrEqual(2);
  await jsClickElement(nav[1]);
  await browser.pause(800);
  await expect(browser).toHaveUrl(expect.stringContaining('/notes'));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Note editing flow', () => {
  it('should navigate to Notes page', async () => {
    await navigateToNotes();
  });

  it('should create a new note and type content in the editor', async () => {
    // Click the "New note" (+) button — typically in the sidebar header area
    // If there are multiple + buttons, we target the one that creates a root note
    const newNoteBtns = await $$('button:has(svg.lucide-plus)');
    // The new-note button should exist somewhere in the notes sidebar
    // Use a more specific selector: look for a button near the notes sidebar
    const sidebarAdd = await $$('aside button[title*="New" i], aside button[aria-label*="New" i]');
    if (sidebarAdd.length > 0) {
      await jsClickElement(sidebarAdd[0]);
    } else {
      // Fallback: try any plus-icon button in the second aside
      await browser.execute(() => {
        const aside = document.querySelectorAll('aside')[1];
        if (!aside) return;
        const plusBtns = aside.querySelectorAll('button');
        for (const btn of plusBtns) {
          if (btn.innerHTML.includes('plus') || btn.innerHTML.includes('Plus')) {
            btn.click();
            return;
          }
        }
      });
    }
    await browser.pause(1000);

    // Verify the editor appeared
    const editor = await $('textarea[placeholder*="Start writing"]');
    await editor.waitForExist({ timeout: 3000 });
  });

  it('should display typed content without dropping characters', async () => {
    // Type several sentences — this exercises the onChange handler and
    // the controlled-value rendering path. If the "double typing" bug
    // (content overwrite on save) exists, some characters may be lost.
    const testContent =
      'Meeting agenda for Q3 planning.\n' +
      'Topics: budget review, team updates, roadmap discussion.\n' +
      'Action items: prepare slides, send invites, review OKRs.\n' +
      'Deadline: end of week.';

    await typeInEditor(testContent);
    await browser.pause(1500); // wait for auto-save debounce

    // Read back the value
    const actual = await getEditorValue();

    // Every line must be present
    expect(actual).toContain('Meeting agenda for Q3 planning');
    expect(actual).toContain('Topics: budget review');
    expect(actual).toContain('Action items: prepare slides');
    expect(actual).toContain('Deadline: end of week');

    // The full text must match exactly (no characters lost or doubled)
    expect(actual).toBe(testContent);
  });

  it('should persist content after navigating away and back', async () => {
    // Wait for auto-save to finish (debounce is 300ms, plus network RTT)
    await browser.pause(2000);

    // Navigate to Dashboard (first nav button)
    const nav = await $$('nav button');
    await jsClickElement(nav[0]);
    await browser.pause(600);

    // Navigate back to Notes
    await jsClickElement(nav[1]);
    await browser.pause(1000);

    // Re-select the untitled note (it should be the first/only root note)
    // If our note was created at root, it appears at the top.
    // Click it to open.
    const rootNotes = await $$('aside:last-child button');
    // Find the first button that is a note (not a folder) — typically
    // the first "Untitled" or whatever title we have.
    const noteBtn = await $('aside:last-child button:not(.group)');
    if (await noteBtn.isExisting()) {
      await jsClickElement(noteBtn);
    } else {
      // Click the first button in the sidebar that looks like a note
      await browser.execute(() => {
        const aside = document.querySelectorAll('aside')[1];
        if (!aside) return;
        // Try clicking the first item that is not a folder header
        const buttons = aside.querySelectorAll('button span');
        for (const span of buttons) {
          const parent = span.closest('a, button');
          if (parent) { parent.click(); return; }
        }
      });
    }
    await browser.pause(1000);

    const editor = await $('textarea[placeholder*="Start writing"]');
    await editor.waitForExist({ timeout: 3000 });

    const actual = await getEditorValue();
    expect(actual).toContain('Meeting agenda for Q3 planning');
    expect(actual).toContain('Topics: budget review');
    expect(actual).toContain('Deadline: end of week');
  });

  it('should allow editing content after reload (no stale overwrite)', async () => {
    // The editor is already open with our text. Now type additional content.
    const appendedText = '\n\n---\nReviewed and approved.';
    await typeInEditor(
      'Meeting agenda for Q3 planning.\n' +
      'Topics: budget review, team updates, roadmap discussion.\n' +
      'Action items: prepare slides, send invites, review OKRs.\n' +
      'Deadline: end of week.\n\n---\nReviewed and approved.'
    );
    await browser.pause(1500);

    const actual = await getEditorValue();
    expect(actual).toContain('Reviewed and approved');
  });

  it('should create a second note with different content (no cross-contamination)', async () => {
    // Create a second note
    await browser.execute(() => {
      const aside = document.querySelectorAll('aside')[1];
      if (!aside) return;
      const plusBtns = aside.querySelectorAll('button');
      for (const btn of plusBtns) {
        if (btn.innerHTML.includes('plus') || btn.innerHTML.includes('Plus')) {
          btn.click();
          return;
        }
      }
    });
    await browser.pause(1000);

    const editor = await $('textarea[placeholder*="Start writing"]');
    await editor.waitForExist({ timeout: 3000 });

    // Type different content
    const secondContent = 'Second note content that is completely different.';
    await typeInEditor(secondContent);
    await browser.pause(1500);

    const actual = await getEditorValue();
    expect(actual).toBe(secondContent);
  });
});
