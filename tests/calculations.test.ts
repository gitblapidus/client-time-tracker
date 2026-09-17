import { describe, expect, it } from "vitest";
import {
  calculateCarryoverUsed,
  calculateForMonth,
  calculateHoursAvailable,
  calculateHoursRemaining,
  calculateMonthSnapshot,
  calculateNextMonthHours,
  calculateRange,
  getUtilizationStatus,
  inheritedCapitalRates,
  type ProjectConfig,
} from "../src/lib/calculations";

const managed = (
  monthlyHours: number,
  maximumCarryoverHours = monthlyHours,
): ProjectConfig => ({
  type: "MANAGED_SERVICE",
  monthlyHours,
  maximumCarryoverHours,
  openingCarryoverHours: null,
  startYear: 2026,
  startMonth: 1,
});

describe("managed service calculations", () => {
  it("Scenario 1: no prior remaining, under allocation", () => {
    const result = calculateMonthSnapshot(managed(40), 30, 0);
    expect(result.hoursAvailable).toBe(40);
    expect(result.hoursRemaining).toBe(10);
    expect(result.hoursForNextMonth).toBe(50);
  });

  it("Scenario 2: prior remaining carries into available hours", () => {
    const result = calculateMonthSnapshot(managed(40), 35, 20);
    expect(result.hoursAvailable).toBe(60);
    expect(result.hoursRemaining).toBe(25);
    expect(result.hoursForNextMonth).toBe(65);
  });

  it("Scenario 3: carryover is capped by maximum carryover", () => {
    const carryover = calculateCarryoverUsed(60, 40);
    expect(carryover).toBe(40);
    const available = calculateHoursAvailable(40, carryover);
    expect(available).toBe(80);
    const result = calculateMonthSnapshot(managed(40, 40), 0, 60);
    expect(result.carryoverUsed).toBe(40);
    expect(result.hoursAvailable).toBe(80);
  });

  it("Scenario 4: next month cannot exceed 2x monthly hours", () => {
    expect(calculateNextMonthHours(50, 40)).toBe(80);
    const result = calculateMonthSnapshot(managed(40), 0, 0);
    const withRemaining = calculateNextMonthHours(50, 40);
    expect(withRemaining).toBe(80);
    expect(result.hoursAvailable).toBe(40);
  });

  it("Scenario 5: over allocation is subtracted from hours for next month", () => {
    const remaining = calculateHoursRemaining(40, 50);
    expect(remaining).toBe(-10);
    const result = calculateMonthSnapshot(managed(40), 50, 0);
    expect(result.hoursRemaining).toBe(-10);
    expect(result.status).toBe("over_allocation");
    expect(result.hoursForNextMonth).toBe(30);
    expect(calculateCarryoverUsed(-10, 40)).toBe(-10);
  });

  it("chains months and respects maximum carryover", () => {
    const config = managed(40, 40);
    const entries = [
      { year: 2026, month: 1, hoursUsed: 30 },
      { year: 2026, month: 2, hoursUsed: 35 },
    ];
    const january = calculateForMonth(config, entries, 2026, 1);
    expect(january.hoursAvailable).toBe(40);
    expect(january.hoursRemaining).toBe(10);

    const february = calculateForMonth(config, entries, 2026, 2);
    expect(february.hoursAvailable).toBe(50);
    expect(february.hoursRemaining).toBe(15);

    const march = calculateForMonth(config, entries, 2026, 3);
    expect(march.hoursAvailable).toBe(55);
  });

  it("subtracts over-allocation from the next month's available hours", () => {
    const config = managed(40, 40);
    const entries = [
      { year: 2026, month: 1, hoursUsed: 50 },
      { year: 2026, month: 2, hoursUsed: 20 },
    ];
    const january = calculateForMonth(config, entries, 2026, 1);
    expect(january.hoursRemaining).toBe(-10);
    expect(january.hoursForNextMonth).toBe(30);

    const february = calculateForMonth(config, entries, 2026, 2);
    expect(february.carryoverUsed).toBe(-10);
    expect(february.hoursAvailable).toBe(30);
    expect(february.hoursRemaining).toBe(10);
  });

  it("does not apply hours from before the project start month to the chain", () => {
    const config: ProjectConfig = {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: null,
      startYear: 2026,
      startMonth: 9,
    };
    const entries = [
      { year: 2026, month: 8, hoursUsed: 42 },
      { year: 2026, month: 9, hoursUsed: 20 },
    ];
    const august = calculateForMonth(config, entries, 2026, 8);
    expect(august.hoursAvailable).toBe(40);
    expect(august.hoursRemaining).toBe(-2);

    const september = calculateForMonth(config, entries, 2026, 9);
    expect(september.carryoverUsed).toBe(0);
    expect(september.hoursAvailable).toBe(40);
    expect(september.hoursRemaining).toBe(20);
  });

  it("uses opening carryover so the first month can start above monthly hours", () => {
    const config: ProjectConfig = {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 40,
      startYear: 2026,
      startMonth: 1,
    };
    const january = calculateForMonth(config, [], 2026, 1);
    expect(january.carryoverUsed).toBe(40);
    expect(january.hoursAvailable).toBe(80);
    expect(january.hoursRemaining).toBe(80);
    expect(january.hoursForNextMonth).toBe(80);
  });

  it("uses the project start month as the first chain month", () => {
    const config: ProjectConfig = {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 40,
      startYear: 2026,
      startMonth: 9,
    };
    const september = calculateForMonth(config, [], 2026, 9);
    expect(september.carryoverUsed).toBe(40);
    expect(september.hoursAvailable).toBe(80);

    const august = calculateForMonth(config, [{ year: 2026, month: 8, hoursUsed: 42 }], 2026, 9);
    expect(august.hoursAvailable).toBe(80);
  });

  it("omits months before the project start from a report range", () => {
    const config: ProjectConfig = {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 40,
      startYear: 2026,
      startMonth: 9,
    };
    const snapshots = calculateRange(config, [], 2026, 8, 2026, 10);
    expect(snapshots.map((row) => row.month)).toEqual([9, 10]);
    expect(snapshots[0]?.hoursAvailable).toBe(80);
  });

  it("does not carry more than maximum carryover across the chain", () => {
    const config = managed(40, 40);
    const entries = [{ year: 2026, month: 1, hoursUsed: 0 }];
    const january = calculateForMonth(config, entries, 2026, 1);
    expect(january.hoursRemaining).toBe(40);
    const february = calculateForMonth(config, entries, 2026, 2);
    expect(february.carryoverUsed).toBe(40);
    expect(february.hoursAvailable).toBe(80);
  });
});

describe("time and materials", () => {
  it("Scenario 6: does not apply allocation or carryover calculations", () => {
    const config: ProjectConfig = {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      startYear: 2026,
      startMonth: 1,
    };
    const result = calculateMonthSnapshot(config, 22.5, 40);
    expect(result.hoursUsed).toBe(22.5);
    expect(result.hoursAvailable).toBeNull();
    expect(result.hoursRemaining).toBeNull();
    expect(result.hoursForNextMonth).toBeNull();
    expect(result.carryoverUsed).toBeNull();
    expect(result.utilizationPercent).toBeNull();
    expect(result.status).toBe("not_applicable");
  });

  it("treats Capital-Time & Material like Time & Materials for monthly snapshots", () => {
    const result = calculateMonthSnapshot(
      {
        type: "CAPITAL_TIME_AND_MATERIALS",
        monthlyHours: null,
        maximumCarryoverHours: null,
        openingCarryoverHours: null,
        startYear: 2026,
        startMonth: 1,
      },
      12,
      40,
    );
    expect(result.hoursUsed).toBe(12);
    expect(result.hoursAvailable).toBeNull();
    expect(result.status).toBe("not_applicable");
  });
});

describe("utilization status bands", () => {
  it("classifies healthy, approaching, at limit, and over allocation", () => {
    expect(getUtilizationStatus(0)).toBe("healthy");
    expect(getUtilizationStatus(74)).toBe("healthy");
    expect(getUtilizationStatus(75)).toBe("approaching");
    expect(getUtilizationStatus(89)).toBe("approaching");
    expect(getUtilizationStatus(90)).toBe("at_limit");
    expect(getUtilizationStatus(100)).toBe("at_limit");
    expect(getUtilizationStatus(100.1)).toBe("over_allocation");
    expect(getUtilizationStatus(null)).toBe("not_applicable");
  });
});

describe("inherited capital rates", () => {
  it("copies currency and rates from the client", () => {
    expect(
      inheritedCapitalRates({ currency: "EUR", devRate: 95, pmRate: 125 }),
    ).toEqual({ currency: "EUR", devRate: 95, pmRate: 125 });
  });

  it("falls back to USD and zero when the client has no billing defaults", () => {
    expect(inheritedCapitalRates(null)).toEqual({ currency: "USD", devRate: 0, pmRate: 0 });
    expect(inheritedCapitalRates({})).toEqual({ currency: "USD", devRate: 0, pmRate: 0 });
  });
});
