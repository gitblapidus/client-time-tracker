import { describe, expect, it } from "vitest";
import { detectMonthRangePreset, monthRangeForPreset } from "../src/lib/months";

describe("month range presets", () => {
  const now = new Date(2026, 8, 15);

  it("sets current month as a single-month range", () => {
    expect(monthRangeForPreset("current", now)).toEqual({ start: "2026-09", end: "2026-09" });
  });

  it("sets previous month as a single-month range", () => {
    expect(monthRangeForPreset("previous", now)).toEqual({ start: "2026-08", end: "2026-08" });
  });

  it("detects current, previous, and custom ranges", () => {
    expect(detectMonthRangePreset("2026-09", "2026-09", now)).toBe("current");
    expect(detectMonthRangePreset("2026-08", "2026-08", now)).toBe("previous");
    expect(detectMonthRangePreset("2026-04", "2026-09", now)).toBe("custom");
    expect(detectMonthRangePreset("2026-01", "2026-01", now)).toBe("custom");
  });
});
