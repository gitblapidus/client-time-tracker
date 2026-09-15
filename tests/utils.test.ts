import { describe, expect, it } from "vitest";
import { formatHours, formatHoursUnit, formatSignedHours } from "../src/lib/utils";

describe("formatHours", () => {
  it("omits decimals for whole numbers", () => {
    expect(formatHours(10)).toBe("10");
    expect(formatHours(10.0)).toBe("10");
    expect(formatHours(1494)).toBe("1,494");
    expect(formatHours(0)).toBe("0");
  });

  it("keeps one decimal when the value is not whole", () => {
    expect(formatHours(10.5)).toBe("10.5");
    expect(formatHours(45.5)).toBe("45.5");
    expect(formatHours(-29.5)).toBe("-29.5");
  });

  it("formats units and signed hours the same way", () => {
    expect(formatHoursUnit(40)).toBe("40 hrs");
    expect(formatHoursUnit(40.5)).toBe("40.5 hrs");
    expect(formatSignedHours(19)).toBe("+19");
    expect(formatSignedHours(11.5)).toBe("+11.5");
    expect(formatSignedHours(-29.5)).toBe("-29.5");
    expect(formatSignedHours(0)).toBe("0");
  });
});
