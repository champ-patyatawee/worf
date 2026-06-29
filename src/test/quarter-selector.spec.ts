import { describe, it, expect } from "vitest";
import { generateQuarters } from "../components/okr/QuarterSelector";

describe("generateQuarters", () => {
  it("returns quarters for 3 years (2025, current year, current year + 1)", () => {
    const quarters = generateQuarters();
    const now = new Date();
    const currentYear = now.getFullYear();
    const years = new Set(quarters.map((q) => q.year));

    expect(years.has(2025)).toBe(true);
    expect(years.has(currentYear)).toBe(true);
    expect(years.has(currentYear + 1)).toBe(true);
    expect(years.size).toBe(3);
  });

  it("current year has all 4 quarters (Q1, Q2, Q3, Q4)", () => {
    const quarters = generateQuarters();
    const now = new Date();
    const currentYear = now.getFullYear();

    const currentYearQuarters = quarters.filter((q) => q.year === currentYear);
    expect(currentYearQuarters).toHaveLength(4);

    const labels = currentYearQuarters.map((q) => q.quarter);
    expect(labels).toContain("Q1");
    expect(labels).toContain("Q2");
    expect(labels).toContain("Q3");
    expect(labels).toContain("Q4");
  });

  it("previous year (2025) has all 4 quarters", () => {
    const quarters = generateQuarters();

    const year2025Quarters = quarters.filter((q) => q.year === 2025);
    expect(year2025Quarters).toHaveLength(4);

    const labels = year2025Quarters.map((q) => q.quarter);
    expect(labels).toContain("Q1");
    expect(labels).toContain("Q2");
    expect(labels).toContain("Q3");
    expect(labels).toContain("Q4");
  });

  it("next year has all 4 quarters", () => {
    const quarters = generateQuarters();
    const now = new Date();
    const currentYear = now.getFullYear();

    const nextYearQuarters = quarters.filter((q) => q.year === currentYear + 1);
    expect(nextYearQuarters).toHaveLength(4);

    const labels = nextYearQuarters.map((q) => q.quarter);
    expect(labels).toContain("Q1");
    expect(labels).toContain("Q2");
    expect(labels).toContain("Q3");
    expect(labels).toContain("Q4");
  });

  it("returns the correct number of total quarters (12 for 3 years × 4 quarters)", () => {
    const quarters = generateQuarters();
    expect(quarters).toHaveLength(12);
  });
});
