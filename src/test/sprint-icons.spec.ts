import { describe, it, expect } from "vitest";

// ── Icon mapping logic ────────────────────────────────────────────────────────
//
// After the removal of the kanban board type, all boards are sprint-type.
// The only valid board icon is RefreshCw (cycle icon).
// The Columns3 icon (previously used for kanban) is deprecated and must never
// be returned from getBoardIcon().
//
// These tests are pure logic — they validate the mapping contract without
// rendering any React components.

type BoardType = "sprint";

/**
 * Returns the Lucide icon name associated with a given board type.
 * After the kanban removal, all boards are sprint and use RefreshCw.
 */
function getBoardIcon(boardType: BoardType): string {
  const iconMap: Record<BoardType, string> = {
    sprint: "RefreshCw",
  };
  return iconMap[boardType];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Board type → icon mapping", () => {
  describe("sprint board type", () => {
    it('should map to "RefreshCw"', () => {
      expect(getBoardIcon("sprint")).toBe("RefreshCw");
    });

    it('should NOT map to "Timer"', () => {
      expect(getBoardIcon("sprint")).not.toBe("Timer");
    });

    it('should NOT map to "Columns3"', () => {
      expect(getBoardIcon("sprint")).not.toBe("Columns3");
    });
  });

  describe("Timer icon deprecation", () => {
    it("should never return Timer for any valid board type", () => {
      expect(getBoardIcon("sprint")).not.toBe("Timer");
    });
  });

  describe("Kanban icon deprecation", () => {
    it("should never return Columns3 (kanban icon is deprecated)", () => {
      // After removing the kanban board type, we must never reference Columns3
      // as a board type icon. All boards use RefreshCw.
      expect(getBoardIcon("sprint")).not.toBe("Columns3");
    });
  });
});
