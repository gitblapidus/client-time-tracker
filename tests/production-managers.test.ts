import { describe, expect, it } from "vitest";
import { normalizeProductionManagerName } from "../src/lib/production-managers";

describe("production manager names", () => {
  it("trims and collapses extra spaces", () => {
    expect(normalizeProductionManagerName("  Chris   Diaz ")).toBe("Chris Diaz");
  });

  it("treats blank values as unset", () => {
    expect(normalizeProductionManagerName("")).toBeNull();
    expect(normalizeProductionManagerName("   ")).toBeNull();
    expect(normalizeProductionManagerName(null)).toBeNull();
  });
});
