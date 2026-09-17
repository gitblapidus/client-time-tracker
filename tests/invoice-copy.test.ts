import { describe, expect, it } from "vitest";
import { formatInvoiceCardText, formatInvoiceReportText } from "../src/lib/invoice-copy";

const managedRow = {
  year: 2026,
  month: 9,
  clientName: "Acme Corporation",
  projectName: "Application Support",
  projectType: "MANAGED_SERVICE",
  monthlyHours: 40,
  hoursAvailable: 49,
  hoursUsed: 30,
  developmentHours: null,
  pmHours: null,
  hoursRemaining: 19,
  hoursForNextMonth: 59,
};

const tmRow = {
  year: 2026,
  month: 9,
  clientName: "Beta LLC",
  projectName: "Website Rebuild",
  projectType: "TIME_AND_MATERIALS",
  monthlyHours: null,
  hoursAvailable: null,
  hoursUsed: 15,
  developmentHours: 12,
  pmHours: 3,
  hoursRemaining: null,
  hoursForNextMonth: null,
};

describe("invoice report copy", () => {
  it("formats a managed service card", () => {
    const text = formatInvoiceCardText(managedRow);
    expect(text).toContain("Client: Acme Corporation");
    expect(text).toContain("Available: 49");
    expect(text).toContain("Used: 30");
    expect(text).toContain("Remaining: +19");
  });

  it("formats a time and materials card", () => {
    const text = formatInvoiceCardText(tmRow);
    expect(text).toContain("Development Hours: 12");
    expect(text).toContain("PM Hours: 3");
    expect(text).toContain("Total: 15");
  });

  it("joins managed and time and materials sections", () => {
    const text = formatInvoiceReportText([managedRow], [tmRow]);
    expect(text).toContain("MANAGED SERVICE (1)");
    expect(text).toContain("TIME & MATERIALS (1)");
  });

  it("includes Capital-Time & Material cards in a separate section", () => {
    const text = formatInvoiceReportText([], [], [{ ...tmRow, projectName: "Capital ERP", projectType: "CAPITAL_TIME_AND_MATERIALS" }]);
    expect(text).toContain("CAPITAL-TIME & MATERIAL (1)");
    expect(text).toContain("Project: Capital ERP");
    expect(text).toContain("Development Hours: 12");
  });
});
