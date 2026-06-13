async function jsClick(selector) {
  const el = await $(selector);
  await el.waitForExist({ timeout: 3000 });
  await browser.execute((el) => el.click(), el);
}
async function jsClickElement(el) {
  await browser.execute((e) => e.click(), el);
}
async function getNoteSidebarText() {
  const asides = await $$('aside');
  return asides.length >= 2 ? asides[1].getText() : '';
}
async function createFolder(name) {
  await jsClick('button[title="New folder"]');
  await browser.pause(300);
  await (await $('input[placeholder="Folder name..."]')).setValue(name);
  await browser.pause(100);
  await jsClick('button=Create');
  await browser.pause(500);
}

describe('Multi-note editing across 2 folders', () => {
  it('should navigate to notes', async () => {
    const nav = await $$('nav button');
    await jsClickElement(nav[1]);
    await browser.pause(800);
    expect(await browser.getUrl()).toMatch(/\/notes/);
  });

  it('should create Folder 1 with 2 notes', async () => {
    await createFolder('Folder 1');
    await browser.pause(200);
    await browser.execute((shouldExpand) => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Folder 1') {
          const group = s.closest('.group');
          if (group) {
            if (shouldExpand) group.querySelector('button')?.click();
            const addBtn = group.querySelector('button[data-testid="add-page"]');
            if (addBtn) {
              addBtn.style.setProperty('opacity', '1', 'important');
              addBtn.style.setProperty('pointer-events', 'auto', 'important');
              addBtn.click();
            }
          }
          break;
        }
      }
    }, true); // expand
    await browser.pause(800);

    await browser.execute(() => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Folder 1') {
          const group = s.closest('.group');
          if (group) {
            const addBtn = group.querySelector('button[data-testid="add-page"]');
            if (addBtn) {
              addBtn.style.setProperty('opacity', '1', 'important');
              addBtn.style.setProperty('pointer-events', 'auto', 'important');
              addBtn.click();
            }
          }
          break;
        }
      }
    }); // no expand needed, already expanded
    await browser.pause(800);
    const matches = (await getNoteSidebarText()).match(/Untitled/g);
    expect(matches ? matches.length : 0).toBeGreaterThanOrEqual(2);
  });

  it('should create Folder 2 with 2 notes', async () => {
    await createFolder('Folder 2');
    await browser.pause(200);
    await browser.execute((shouldExpand) => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Folder 2') {
          const group = s.closest('.group');
          if (group) {
            if (shouldExpand) group.querySelector('button')?.click();
            const addBtn = group.querySelector('button[data-testid="add-page"]');
            if (addBtn) {
              addBtn.style.setProperty('opacity', '1', 'important');
              addBtn.style.setProperty('pointer-events', 'auto', 'important');
              addBtn.click();
            }
          }
          break;
        }
      }
    }, true);
    await browser.pause(800);

    await browser.execute(() => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Folder 2') {
          const group = s.closest('.group');
          if (group) {
            const addBtn = group.querySelector('button[data-testid="add-page"]');
            if (addBtn) {
              addBtn.style.setProperty('opacity', '1', 'important');
              addBtn.style.setProperty('pointer-events', 'auto', 'important');
              addBtn.click();
            }
          }
          break;
        }
      }
    });
    await browser.pause(800);
    const matches = (await getNoteSidebarText()).match(/Untitled/g);
    expect(matches ? matches.length : 0).toBeGreaterThanOrEqual(4);
  });

  // Helper: click a page by its display title in the sidebar
  async function clickPage(title) {
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

  it('should rename 4 notes with distinct titles', async () => {
    const titles = ['Project Plan', 'Meeting Notes', 'Design Spec', 'Bug Tracker'];
    for (const title of titles) {
      await clickPage('Untitled');
      await browser.pause(800);
      const input = await $('input.font-extrabold');
      await input.waitForExist({ timeout: 3000 });
      await input.click();
      await input.clearValue();
      await input.setValue(title);
      await browser.pause(600);
    }
    const text = await getNoteSidebarText();
    for (const t of titles) expect(text).toContain(t);
  });

  it('should create a page with long content and verify save', async () => {
    await createFolder('Save Test');
    await browser.pause(200);
    await browser.execute(() => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Save Test') {
          const group = s.closest('.group');
          if (group) {
            group.querySelector('button')?.click();
            const addBtn = group.querySelector('button[data-testid="add-page"]');
            if (addBtn) {
              addBtn.style.setProperty('opacity', '1', 'important');
              addBtn.style.setProperty('pointer-events', 'auto', 'important');
              addBtn.click();
            }
          }
          break;
        }
      }
    });
    await browser.pause(800);

    await clickPage('Untitled');
    await browser.pause(800);

    const input = await $('input.font-extrabold');
    await input.waitForExist({ timeout: 3000 });
    await input.click();
    await input.clearValue();
    await input.setValue('Long Content Test');
    await browser.pause(500);

    // Type content into the editor via JavaScript (bypasses WKWebView keyboard bug)
    await browser.execute(() => {
      const proseMirror = document.querySelector('.ProseMirror');
      if (!proseMirror) return;
      proseMirror.focus();
      // Focus the editor and insert text
      const selection = window.getSelection();
      const range = document.createRange();
      const textNode = proseMirror.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      document.execCommand('insertText', false,
        'Meeting agenda for Q2 planning.\n' +
        'Topics: budget review, team updates, roadmap.\n' +
        'Action items: prepare slides, send invites.'
      );
      proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await browser.pause(2000);

    // Navigate to Dashboard and back
    const nav = await $$('nav button');
    await jsClickElement(nav[0]);
    await browser.pause(600);
    await jsClickElement(nav[1]);
    await browser.pause(800);

    // Expand Save Test folder again (collapsed after navigation)
    await browser.execute(() => {
      const sidebar = document.querySelectorAll('aside')[1];
      if (!sidebar) return;
      const spans = sidebar.querySelectorAll('span');
      for (const s of spans) {
        if (s.textContent === 'Save Test') {
          const row = s.closest('.group');
          if (row) row.querySelector('button')?.click();
          break;
        }
      }
    });
    await browser.pause(300);

    // Re-open the page
    await clickPage('Long Content Test');
    await browser.pause(1000);

    const titleAfter = await $('input.font-extrabold');
    await titleAfter.waitForExist({ timeout: 3000 });
    expect(await titleAfter.getValue()).toBe('Long Content Test');

    // Verify content persisted
    const editorAfter = await $('.ProseMirror');
    const content = await editorAfter.getText();
    expect(content).toMatch(/Meeting agenda/i);
    expect(content).toMatch(/Q2 planning/i);
    expect(content).toMatch(/budget review/i);
    expect(content).toMatch(/Action items/i);
  });

  it('should verify all titles independent', async () => {
    // Expand Folder 1 and Folder 2 to reveal page titles
    for (const folder of ['Folder 1', 'Folder 2']) {
      await browser.execute((f) => {
        const sidebar = document.querySelectorAll('aside')[1];
        if (!sidebar) return;
        const spans = sidebar.querySelectorAll('span');
        for (const s of spans) {
          if (s.textContent === f) {
            const row = s.closest('.group');
            if (row) row.querySelector('button')?.click();
            break;
          }
        }
      }, folder);
    }
    await browser.pause(300);

    const text = await getNoteSidebarText();
    for (const t of ['Project Plan', 'Meeting Notes', 'Design Spec', 'Bug Tracker', 'Long Content Test']) {
      expect(text).toContain(t);
    }
  });
});
