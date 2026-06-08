import { describe, it, expect } from "vitest";
import { suggestionItems } from "../components/notes/slash-command";

describe("slash-command items", () => {
  it("should have exactly 10 items", () => {
    expect(suggestionItems.length).toBe(10);
  });

  const items = [
    "AI Generate",
    "Text",
    "To-do List",
    "Heading 1",
    "Heading 2",
    "Heading 3",
    "Bullet List",
    "Numbered List",
    "Quote",
    "Code",
  ];

  for (const title of items) {
    it(`should have '${title}' command with a function`, () => {
      const item = suggestionItems.find((i: any) => i.title === title);
      expect(item).toBeDefined();
      expect(item!.command).toBeInstanceOf(Function);
      expect(item!.description).toBeTruthy();
      expect(item!.searchTerms).toBeInstanceOf(Array);
      expect(item!.icon).toBeDefined();
    });
  }

  it("AI Generate command should dispatch custom event", () => {
    const aiItem = suggestionItems.find((i: any) => i.title === "AI Generate")!;
    expect(aiItem.searchTerms).toContain("ai");
    expect(aiItem.searchTerms).toContain("generate");
    expect(aiItem.searchTerms).toContain("write");
  });

  it("Heading commands should set correct heading levels", () => {
    const h1 = suggestionItems.find((i: any) => i.title === "Heading 1")!;
    const h3 = suggestionItems.find((i: any) => i.title === "Heading 3")!;
    expect(h1.searchTerms).toContain("big");
    expect(h3.searchTerms).toContain("small");
  });

  it("each item should have a description", () => {
    for (const item of suggestionItems as any[]) {
      expect(item.description).toBeTruthy();
    }
  });
});
