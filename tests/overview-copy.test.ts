import { describe, expect, it } from "vitest";
import { formatOverviewReportHtml, formatOverviewReportText, formatWeeklyStatusReportHtml, formatWeeklyStatusReportText } from "../src/lib/overview-copy";

const managedRow = {
  year: 2026,
  month: 9,
  clientName: "KION",
  projectName: "KION Managed Services",
  productionManager: "Brad Lapidus",
  projectType: "MANAGED_SERVICE",
  monthlyHours: 40,
  hoursAvailable: 38,
  hoursUsed: 20,
  developmentHours: null,
  pmHours: null,
  hoursRemaining: 18,
  hoursForNextMonth: 58,
};

const tmRow = {
  year: 2026,
  month: 9,
  clientName: "Vanderschooten",
  projectName: "VDS_Doofinder Project",
  productionManager: null,
  projectType: "TIME_AND_MATERIALS",
  monthlyHours: null,
  hoursAvailable: null,
  hoursUsed: 15,
  developmentHours: 10,
  pmHours: 5,
  hoursRemaining: null,
  hoursForNextMonth: null,
  currency: "USD",
  totalSpend: 1400,
};

const capitalRow = {
  year: 2026,
  month: 9,
  clientName: "KION",
  projectName: "KION Capital ERP",
  productionManager: null,
  projectType: "CAPITAL_TIME_AND_MATERIALS",
  monthlyHours: null,
  hoursAvailable: null,
  hoursUsed: 15,
  developmentHours: 10,
  pmHours: 5,
  hoursRemaining: null,
  hoursForNextMonth: null,
  currency: "EUR",
  totalSpend: 1575,
};

describe("overview report copy", () => {
  it("formats managed service and time and materials tables", () => {
    const text = formatOverviewReportText([managedRow], [tmRow]);
    expect(text).toContain("MANAGED SERVICE (1)");
    expect(text).toContain("Month\tClient\tProject\tProject Manager\tAvailable\tUsed\tRemaining\tNext Month");
    expect(text).toContain("September 2026\tKION\tKION Managed Services\tBrad Lapidus\t38\t20\t+18\t58 (Includes 18 hrs carryover)");
    expect(text).toContain("TIME & MATERIALS (1)");
    expect(text).toContain("Development Hours\tPM Hours\tTotal");
    expect(text).toContain("Vanderschooten\tVDS_Doofinder Project\t—\t10\t5\t15");
  });

  it("renders HTML tables with section headings", () => {
    const html = formatOverviewReportHtml([managedRow], [tmRow]);
    expect(html).toContain("Managed Service (1)");
    expect(html).toContain("Time &amp; Materials (1)");
    expect(html).toContain("KION Managed Services");
    expect(html).toContain("Includes 18 hrs carryover");
    expect(html).toContain("VDS_Doofinder Project");
  });
});

describe("weekly status report copy", () => {
  it("omits month, client, and project manager columns and includes the heading", () => {
    const text = formatWeeklyStatusReportText(
      "KION — September 2026",
      { totalAvailableHours: 38, totalUsedHours: 35, totalRemainingHours: 18, utilizationPercent: 89.7 },
      [managedRow],
      [tmRow],
      [capitalRow],
    );
    expect(text).toContain("KION — September 2026");
    expect(text).toContain("Total Available\t38");
    expect(text).toContain("MANAGED SERVICE (1)");
    expect(text).toContain("Project\tAvailable\tUsed\tRemaining\tNext Month");
    expect(text).not.toContain("Month\tClient\tProject");
    expect(text).toContain("KION Managed Services\t38\t20\t+18\t58 (Includes 18 hrs carryover)");
    expect(text).toContain("Total\t38\t20\t+18\t58");
    expect(text).toContain("VDS_Doofinder Project\t10\t5\t15\t$1,400");
    expect(text).toContain("Total\t10\t5\t15\t$1,400");
    expect(text).toContain("KION Capital ERP\t10\t5\t15\t1,575 €");
    expect(text).toContain("Total\t10\t5\t15\t1,575 €");
    expect(text).toContain("Total Spend");
    expect(text).not.toContain("Brad Lapidus");
  });

  it("includes Total Spend on the HTML grouping total row", () => {
    const html = formatWeeklyStatusReportHtml(
      "VANDERSCHOOTEN — September 2026",
      { totalAvailableHours: 0, totalUsedHours: 30, totalRemainingHours: 0, utilizationPercent: 0 },
      [],
      [tmRow],
      [capitalRow],
    );
    expect(html).toContain("Total Spend");
    expect(html).toMatch(/font-weight:700;[^>]*>\$1,400</);
    expect(html).toMatch(/font-weight:700;[^>]*>1,575 €</);
    expect(html).toContain(">$1,400<");
    expect(html).toContain(">1,575 €<");
  });

  it("shows each currency on the weekly Total Spend total row", () => {
    const text = formatWeeklyStatusReportText(
      "VANDERSCHOOTEN — September 2026",
      { totalAvailableHours: 0, totalUsedHours: 63, totalRemainingHours: 0, utilizationPercent: 0 },
      [],
      [],
      [
        { ...capitalRow, projectName: "EUR Project", currency: "EUR", totalSpend: 1760, hoursUsed: 20, developmentHours: 16, pmHours: 4 },
        { ...capitalRow, projectName: "USD Project", currency: "USD", totalSpend: 3720, hoursUsed: 43, developmentHours: 36, pmHours: 7 },
      ],
    );
    expect(text).toContain("Total\t52\t11\t63\t1,760 € + $3,720");
  });

  it("includes a Client column when copying multiple clients", () => {
    const text = formatWeeklyStatusReportText(
      "KION, VANDERSCHOOTEN — September 2026",
      { totalAvailableHours: 38, totalUsedHours: 55, totalRemainingHours: 18, utilizationPercent: 89.7 },
      [managedRow],
      [tmRow],
      [capitalRow],
      true,
    );
    expect(text).toContain("Client\tProject\tAvailable\tUsed\tRemaining\tNext Month");
    expect(text).toContain("KION\tKION Managed Services");
    expect(text).toContain("Client\tProject\tDevelopment Hours\tPM Hours\tTotal\tTotal Spend");
    expect(text).toContain("Vanderschooten\tVDS_Doofinder Project");
  });
});
