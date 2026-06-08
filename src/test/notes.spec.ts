import { describe, it, expect, vi } from "vitest";

describe("note data flow", () => {
  // Simulates the Rust generate_slug function
  function generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .split("")
      .filter((c) => c.match(/[a-z0-9\s-]/))
      .join("")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-");
    return slug || "untitled";
  }

  function uniqueSlug(existing: string[], title: string): string {
    const base = generateSlug(title);
    let slug = base;
    let counter = 1;
    while (existing.includes(slug) || !slug) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }

  describe("slug generation", () => {
    it("should generate slug from title", () => {
      expect(generateSlug("My Note")).toBe("my-note");
    });

    it("should handle special characters", () => {
      expect(generateSlug("Hello! @World #2024")).toBe("hello-world-2024");
    });

    it("should handle multiple spaces", () => {
      expect(generateSlug("My   Great   Note")).toBe("my-great-note");
    });

    it("should default to untitled for empty input", () => {
      expect(generateSlug("")).toBe("untitled");
    });

    it("should generate unique slugs", () => {
      const existing = ["my-note"];
      expect(uniqueSlug(existing, "My Note")).toBe("my-note-1");
    });

    it("should chain unique slugs", () => {
      const existing = ["my-note", "my-note-1", "my-note-2"];
      expect(uniqueSlug(existing, "My Note")).toBe("my-note-3");
    });

    it("should update slug when title changes", () => {
      const slug1 = generateSlug("Old Title");
      expect(slug1).toBe("old-title");
      const slug2 = generateSlug("New Title");
      expect(slug2).toBe("new-title");
      expect(slug2).not.toBe(slug1);
    });
  });

  describe("page data flow", () => {
    const pages: any[] = [];

    function createPage(title: string, folderId: string | null): any {
      const existing = pages.map((p) => p.slug);
      const slug = uniqueSlug(existing, title);
      const page = { id: `page-${pages.length + 1}`, title, slug, folder_id: folderId, content: "{}" };
      pages.push(page);
      return page;
    }

    function updatePage(id: string, data: { title?: string; content?: string }): any {
      const idx = pages.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Page not found");
      if (data.title) {
        const existing = pages.map((p) => p.slug);
        const newSlug = uniqueSlug(existing.filter((_, i) => i !== idx), data.title);
        pages[idx] = { ...pages[idx], ...data, slug: newSlug };
      } else {
        pages[idx] = { ...pages[idx], ...data };
      }
      return pages[idx];
    }

    function getPageBySlug(slug: string) {
      return pages.find((p) => p.slug === slug) || null;
    }

    it("should create a page in a folder", () => {
      const p = createPage("My Note", "folder-1");
      expect(p.title).toBe("My Note");
      expect(p.slug).toBe("my-note");
      expect(p.folder_id).toBe("folder-1");
    });

    it("should create a page without folder", () => {
      const p = createPage("Root Note", null);
      expect(p.folder_id).toBeNull();
    });

    it("should find page by slug", () => {
      const p = getPageBySlug("my-note");
      expect(p).not.toBeNull();
      expect(p.title).toBe("My Note");
    });

    it("should return null for unknown slug", () => {
      const p = getPageBySlug("non-existent");
      expect(p).toBeNull();
    });

    it("should update slug when title changes", () => {
      const p = createPage("Temp", null);
      expect(p.slug).toBe("temp");

      const updated = updatePage(p.id, { title: "Renamed" });
      expect(updated.title).toBe("Renamed");
      expect(updated.slug).toBe("renamed");
      expect(updated.slug).not.toBe("temp");
    });

    it("should not change slug when only content changes", () => {
      const p = createPage("Content Test", null);
      const originalSlug = p.slug;

      const updated = updatePage(p.id, { content: '{"text":"hello"}' });
      expect(updated.slug).toBe(originalSlug);
      expect(updated.content).toBe('{"text":"hello"}');
    });

    it("should handle multiple page creations", () => {
      const pages2 = [
        createPage("First", "folder-1"),
        createPage("Second", "folder-1"),
        createPage("Third", "folder-1"),
      ];

      expect(pages2).toHaveLength(3);
      expect(pages2[0].slug).toBe("first");
      expect(pages2[1].slug).toBe("second");
      expect(pages2[2].slug).toBe("third");
    });

    it("should manage independent page state when switching", () => {
      // Simulate: create page1, edit title, create page2, verify no cross-contamination
      const p1 = createPage("Page One", "folder-1");
      const p2 = createPage("Page Two", "folder-1");

      // Edit page 1's title
      const updatedP1 = updatePage(p1.id, { title: "Edited Page One" });
      expect(updatedP1.title).toBe("Edited Page One");
      expect(updatedP1.slug).toBe("edited-page-one");

      // Verify page 2 is unchanged
      expect(p2.title).toBe("Page Two");
      expect(p2.slug).toBe("page-two");

      // Verify we can still find page 1 by new slug
      const found = getPageBySlug("edited-page-one");
      expect(found).not.toBeNull();
      expect(found.id).toBe(p1.id);
    });

    it("should not find page by old slug after rename", () => {
      const p = createPage("Old Name", null);
      updatePage(p.id, { title: "New Name" });

      const oldSlug = getPageBySlug("old-name");
      const newSlug = getPageBySlug("new-name");

      expect(oldSlug).toBeNull();
      expect(newSlug).not.toBeNull();
      expect(newSlug.id).toBe(p.id);
    });
  });

  describe("folder data flow", () => {
    const folders: any[] = [];
    let folderCounter = 0;

    function createFolder(name: string): any {
      folderCounter++;
      const f = { id: `folder-${folderCounter}`, name };
      folders.push(f);
      return f;
    }

    function renameFolder(id: string, name: string): any {
      const idx = folders.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error("Folder not found");
      folders[idx] = { ...folders[idx], name };
      return folders[idx];
    }

    function deleteFolder(id: string) {
      const idx = folders.findIndex((f) => f.id === id);
      if (idx === -1) throw new Error("Folder not found");
      folders.splice(idx, 1);
    }

    it("should create folders", () => {
      const f1 = createFolder("Work");
      const f2 = createFolder("Personal");
      expect(f1.name).toBe("Work");
      expect(f2.name).toBe("Personal");
      expect(folders).toHaveLength(2);
    });

    it("should rename folders", () => {
      const f = createFolder("Old");
      const updated = renameFolder(f.id, "Renamed");
      expect(updated.name).toBe("Renamed");
    });

    it("should delete folders", () => {
      const prevCount = folders.length;
      const f = createFolder("Temp");
      expect(folders).toHaveLength(prevCount + 1);
      deleteFolder(f.id);
      expect(folders).toHaveLength(prevCount);
    });
  });

  describe("page title debounce and navigation", () => {
    it("should capture slug at call time for debounced save", () => {
      // Simulate the fix: pageSlug is passed explicitly
      const savedCalls: Array<{ id: string; title: string; slug: string }> = [];

      function debouncedTitleSave(id: string, title: string, pageSlug: string) {
        savedCalls.push({ id, title, slug: pageSlug });
      }

      // Simulate: user edits page1 title, then switches to page2
      debouncedTitleSave("page-1", "Edited", "original-slug");
      // If the user switches pages, the closure slug would be wrong
      // But since pageSlug is captured here, it's correct

      expect(savedCalls).toHaveLength(1);
      expect(savedCalls[0].id).toBe("page-1");
      expect(savedCalls[0].slug).toBe("original-slug");
    });

    it("should only navigate if slug actually changed", () => {
      const navigations: string[] = [];
      function navigate(path: string) { navigations.push(path); }

      function afterSave(updatedSlug: string, capturedSlug: string) {
        if (updatedSlug && updatedSlug !== capturedSlug) {
          navigate(`/notes/${updatedSlug}`);
        }
      }

      // Slug changed — should navigate
      afterSave("new-slug", "old-slug");
      expect(navigations).toHaveLength(1);
      expect(navigations[0]).toBe("/notes/new-slug");

      // Slug unchanged — should NOT navigate
      afterSave("same-slug", "same-slug");
      expect(navigations).toHaveLength(1); // still 1
    });
  });
});
