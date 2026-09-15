import { describe, expect, it } from "vitest";
import { partitionByProjectType, resolveTmHours, totalTmHours } from "../src/lib/time-hours";
import { timeEntryItemSchema } from "../src/lib/validations";

describe("T&M hour splits", () => {
  it("totals development and PM hours", () => {
    expect(totalTmHours(20, 2.5)).toBe(22.5);
  });

  it("treats legacy hoursUsed as development hours", () => {
    expect(resolveTmHours({ hoursUsed: 11 })).toEqual({
      developmentHours: 11,
      pmHours: 0,
      hoursUsed: 11,
    });
  });

  it("uses stored splits when present", () => {
    expect(resolveTmHours({ hoursUsed: 99, developmentHours: 8, pmHours: 1.5 })).toEqual({
      developmentHours: 8,
      pmHours: 1.5,
      hoursUsed: 9.5,
    });
  });

  it("groups managed service and T&M rows separately", () => {
    const grouped = partitionByProjectType([
      { projectType: "TIME_AND_MATERIALS", name: "Integrations" },
      { type: "MANAGED_SERVICE", name: "Support" },
      { projectType: "MANAGED_SERVICE", name: "Cloud" },
    ]);
    expect(grouped.managed.map((row) => row.name)).toEqual(["Support", "Cloud"]);
    expect(grouped.timeAndMaterials.map((row) => row.name)).toEqual(["Integrations"]);
  });
});

describe("time entry payload", () => {
  it("accepts managed service hours used", () => {
    expect(timeEntryItemSchema.parse({ projectId: "p1", hoursUsed: 12.5 })).toMatchObject({
      projectId: "p1",
      hoursUsed: 12.5,
    });
  });

  it("accepts T&M development and PM hours without a total", () => {
    expect(
      timeEntryItemSchema.parse({
        projectId: "p2",
        developmentHours: 8,
        pmHours: 1.5,
      }),
    ).toMatchObject({
      projectId: "p2",
      developmentHours: 8,
      pmHours: 1.5,
    });
  });
});
