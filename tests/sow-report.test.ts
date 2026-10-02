import { describe, expect, it } from "vitest";
import { formatSowReportHtml, formatSowReportText, sowProjectLabel, sowRemaining, sowReportTotals } from "../src/lib/sow-report";

const rows = [
  {
    projectId: "p1",
    clientName: "Acme",
    projectName: "SOW Build",
    productionManager: "Morgan",
    quotedHours: 80,
    developmentHours: 20,
    deliveryLeadHours: 6,
    technicalLeadershipHours: 4,
    hoursUsed: 30,
    hoursRemaining: 50,
  },
  {
    projectId: "p2",
    clientName: "Beta",
    projectName: "SOW Support",
    productionManager: null,
    quotedHours: 20,
    developmentHours: 18,
    deliveryLeadHours: 5,
    technicalLeadershipHours: 2,
    hoursUsed: 25,
    hoursRemaining: -5,
  },
];

describe("SOW report helpers", () => {
  it("labels a row as client — project", () => {
    expect(sowProjectLabel(rows[0])).toBe("Acme — SOW Build");
  });

  it("computes remaining as quoted minus used", () => {
    expect(sowRemaining(80, 30)).toBe(50);
    expect(sowRemaining(20, 25)).toBe(-5);
  });

  it("totals quoted, used by role, and remaining", () => {
    expect(sowReportTotals(rows)).toEqual({
      quotedHours: 100,
      developmentHours: 38,
      deliveryLeadHours: 11,
      technicalLeadershipHours: 6,
      hoursUsed: 55,
      hoursRemaining: 45,
    });
  });

  it("formats text and html with the split hour columns", () => {
    const text = formatSowReportText(rows);
    expect(text).toContain("Project");
    expect(text).toContain("Quoted Hours");
    expect(text).toContain("Development");
    expect(text).toContain("Delivery Lead");
    expect(text).toContain("Technical Leadership");
    expect(text).toContain("Total");
    expect(text).toContain("Remaining");
    expect(text).toContain("Acme — SOW Build");

    const html = formatSowReportHtml(rows);
    expect(html).toContain("Development");
    expect(html).toContain("Delivery Lead");
    expect(html).toContain("Technical Leadership");
    expect(html).toContain("Acme — SOW Build");
  });
});
