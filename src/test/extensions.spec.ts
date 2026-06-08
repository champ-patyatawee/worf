import { describe, it, expect } from "vitest";
import { defaultExtensions } from "../components/notes/extensions";

describe("editor extensions", () => {
  it("should have at least 10 extensions", () => {
    expect(defaultExtensions.length).toBeGreaterThanOrEqual(10);
  });

  it("should include StarterKit", () => {
    const hasStarterKit = defaultExtensions.some(
      (e: any) => e.name === "starterKit" || e.config?.name === "starterKit"
    );
    expect(hasStarterKit).toBe(true);
  });

  it("should include Placeholder extension", () => {
    const hasPlaceholder = defaultExtensions.some(
      (e: any) => e.name === "placeholder" || e.config?.name === "placeholder"
    );
    expect(hasPlaceholder).toBe(true);
  });

  it("should include CodeBlockLowlight or code extension", () => {
    const names = defaultExtensions.map((e: any) => e.name || e.config?.name);
    const hasCodeRelated = names.some(
      (n: string) =>
        n?.toLowerCase().includes("code") || n?.toLowerCase().includes("lowlight")
    );
    expect(hasCodeRelated).toBe(true);
  });
});
