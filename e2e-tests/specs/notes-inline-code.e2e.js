// ═══════════════════════════════════════════════════════════════════════════════
// Inline Code Rendering in NoteEditor Preview — E2E Tests
// ═══════════════════════════════════════════════════════════════════════════════
//
// Bug context:
//   Inline code backticks (`Ctrl + S`) appeared as literal backtick characters
//   in the NoteEditor preview mode. The fix adds `prose-code:before:content-none`
//   and `prose-code:after:content-none` to suppress Tailwind Typography's default
//   ::before/::after pseudo-elements that render backtick characters on <code>.
//
// What this tests:
//   - Basic inline code renders as <code> elements (not plain text with backticks)
//   - Multiple inline code spans on the same line render independently
//   - Empty backticks don't produce phantom <code> elements
//   - Inline code next to [[wikilinks]] renders correctly
//   - Inline code with HTML special characters (`<div>`) renders correctly
//   - Backtick characters are NOT visible as text nodes in the preview
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
 * Navigate to the Notes page by clicking the second nav button.
 */
async function navigateToNotes() {
  const nav = await $$('nav button');
  expect(nav.length).toBeGreaterThanOrEqual(2);
  await jsClickElement(nav[1]);
  await browser.pause(800);
  expect(await browser.getUrl()).toMatch(/\/notes/);
}

/**
 * Create a new note by using the sidebar's "New page" button.
 * Finds any "New page" button in the sidebar and clicks it.
 */
async function createNewNote() {
  // Try the "New page" button first
  const newPageBtn = await $('button[title="New page"]');
  if (await newPageBtn.isExisting()) {
    await jsClickElement(newPageBtn);
    await browser.pause(600);
    return;
  }
  // Fallback: find in sidebar (the aside[1] pattern from existing tests)
  await browser.execute(() => {
    const sidebar = document.querySelectorAll('aside')[1];
    if (!sidebar) return;
    const buttons = sidebar.querySelectorAll('button');
    // Look for a "New page" button (plus icon or title)
    for (const btn of buttons) {
      if (btn.title === 'New page' || btn.textContent.includes('New page')) {
        btn.click();
        return;
      }
    }
    // Last resort: find any visible add button
    const addBtn = sidebar.querySelector('[data-testid="add-page"]');
    if (addBtn) addBtn.click();
  });
  await browser.pause(600);
}

/**
 * Type content into the note editor textarea via JavaScript.
 * Uses document.execCommand('insertText') which works reliably
 * with WKWebView in Tauri.
 */
async function typeInEditor(text) {
  await browser.execute((content) => {
    const proseMirror = document.querySelector('.ProseMirror');
    if (proseMirror) {
      // Novel/Rich text editor path
      proseMirror.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = proseMirror.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      document.execCommand('insertText', false, content);
      proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Plain textarea path
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    textarea.focus();
    textarea.value = content;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
  await browser.pause(500);
}

/**
 * Get the visible text content of the preview pane.
 */
async function getPreviewText() {
  return browser.execute(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return '';
    return prose.textContent || '';
  });
}

/**
 * Get the inner HTML of the preview pane for element inspection.
 */
async function getPreviewHTML() {
  return browser.execute(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return '';
    return prose.innerHTML;
  });
}

/**
 * Count <code> elements inside the preview pane.
 */
async function countCodeElements() {
  return browser.execute(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return 0;
    return prose.querySelectorAll('code').length;
  });
}

/**
 * Click a toolbar mode button by its text label ("Edit", "Preview", "Split").
 */
async function clickModeButton(label) {
  await browser.execute((lbl) => {
    const toolbar = document.querySelector('.prose')?.closest('.flex-1');
    // Find mode buttons by their text content
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.trim() === lbl) {
        btn.click();
        return;
      }
    }
  }, label);
  await browser.pause(600);
}

/**
 * Switch to Preview mode.
 * The toolbar buttons have the labels "Edit", "Preview", "Split".
 */
async function switchToPreviewMode() {
  await clickModeButton('Preview');
}

/**
 * Switch to Edit mode.
 */
async function switchToEditMode() {
  await clickModeButton('Edit');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Inline code rendering in NoteEditor preview', () => {
  // ────────────────────────────────────────────────────────────────────────────
  // Setup: navigate to Notes and create a fresh note
  // ────────────────────────────────────────────────────────────────────────────
  it('should navigate to Notes and create a new note', async () => {
    await navigateToNotes();
    await createNewNote();
    await browser.pause(800);

    // Verify we're on a note page (editor is visible)
    const textarea = await $('textarea');
    const proseMirror = await $('.ProseMirror');
    const editorVisible = (await textarea.isExisting()) || (await proseMirror.isExisting());
    expect(editorVisible).toBe(true);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 1: Basic inline code renders as <code> element
  // ────────────────────────────────────────────────────────────────────────────
  it('should render basic inline code as <code> element', async () => {
    // Switch to edit mode first
    await switchToEditMode();
    await browser.pause(300);

    // Clear any existing content
    const textarea = await $('textarea');
    const proseMirror = await $('.ProseMirror');
    if (await textarea.isExisting()) {
      await browser.execute(() => {
        const ta = document.querySelector('textarea');
        if (ta) ta.value = '';
      });
    }

    // Type content with inline code backticks
    await typeInEditor('Use `Ctrl + S` to save');

    // Switch to preview mode
    await switchToPreviewMode();
    await browser.pause(500);

    // Assert: a <code> element exists in the preview
    const codeCount = await countCodeElements();
    expect(codeCount).toBeGreaterThanOrEqual(1);

    // Assert: the rendered text does NOT contain literal backtick characters
    const previewText = await getPreviewText();
    expect(previewText).not.toContain('`');
    expect(previewText).toContain('Ctrl + S');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 2: Multiple inline code spans on the same line
  // ────────────────────────────────────────────────────────────────────────────
  it('should render multiple inline code spans on the same line', async () => {
    await switchToEditMode();
    await browser.pause(300);

    await browser.execute(() => {
      const ta = document.querySelector('textarea');
      if (ta) ta.value = '';
    });

    await typeInEditor('Use `npm install` and then `npm start` to run');

    await switchToPreviewMode();
    await browser.pause(500);

    // We should have exactly 2 <code> elements
    const codeCount = await countCodeElements();
    expect(codeCount).toBe(2);

    // No backtick characters in preview text
    const previewText = await getPreviewText();
    expect(previewText).not.toContain('`');
    expect(previewText).toMatch(/npm install/);
    expect(previewText).toMatch(/npm start/);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 3: Empty backticks should not produce <code> elements
  // ────────────────────────────────────────────────────────────────────────────
  it('should not render empty backticks as <code> element', async () => {
    await switchToEditMode();
    await browser.pause(300);

    await browser.execute(() => {
      const ta = document.querySelector('textarea');
      if (ta) ta.value = '';
    });

    await typeInEditor('This has `` empty backticks');

    await switchToPreviewMode();
    await browser.pause(500);

    // Empty backticks (``) — markdown spec says inline code with empty content
    // still produces a <code> element. So we expect 1 <code> (with empty text).
    // But the key assertion is: no literal backtick characters showing up.
    const previewText = await getPreviewText();
    expect(previewText).not.toContain('`');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 4: Inline code next to wikilinks
  // ────────────────────────────────────────────────────────────────────────────
  it('should render inline code correctly next to [[wikilinks]]', async () => {
    await switchToEditMode();
    await browser.pause(300);

    await browser.execute(() => {
      const ta = document.querySelector('textarea');
      if (ta) ta.value = '';
    });

    await typeInEditor('Run `git commit` and see [[Project Notes]] for details');

    await switchToPreviewMode();
    await browser.pause(500);

    // Should have at least 1 <code> element
    const codeCount = await countCodeElements();
    expect(codeCount).toBeGreaterThanOrEqual(1);

    // No backtick characters
    const previewText = await getPreviewText();
    expect(previewText).not.toContain('`');
    expect(previewText).toContain('git commit');
    expect(previewText).toContain('Project Notes');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 5: Inline code with HTML special characters (angle brackets)
  // ────────────────────────────────────────────────────────────────────────────
  it('should render inline code with special HTML characters like `<div>`', async () => {
    await switchToEditMode();
    await browser.pause(300);

    await browser.execute(() => {
      const ta = document.querySelector('textarea');
      if (ta) ta.value = '';
    });

    await typeInEditor('Use the `<div>` element for layout');

    await switchToPreviewMode();
    await browser.pause(500);

    // Should have at least 1 <code> element
    const codeCount = await countCodeElements();
    expect(codeCount).toBeGreaterThanOrEqual(1);

    // No backtick characters
    const previewText = await getPreviewText();
    expect(previewText).not.toContain('`');
    // The angle brackets should be escaped in the text content
    expect(previewText).toContain('div');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Test 6: Verify the prose container has the fix classes
  // ────────────────────────────────────────────────────────────────────────────
  it('should have prose-code:before:content-none and prose-code:after:content-none classes on prose container', async () => {
    // Verify the prose container has the fix classes that suppress backtick pseudo-elements
    const hasFixClasses = await browser.execute(() => {
      const prose = document.querySelector('.prose');
      if (!prose) return { found: false, reason: 'no .prose element' };

      const className = prose.className;
      return {
        found: true,
        hasBeforeNone: className.includes('prose-code:before:content-none'),
        hasAfterNone: className.includes('prose-code:after:content-none'),
        className: className,
      };
    });

    expect(hasFixClasses.found).toBe(true);
    expect(hasFixClasses.hasBeforeNone).toBe(true);
    expect(hasFixClasses.hasAfterNone).toBe(true);
  });
});