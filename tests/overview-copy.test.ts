import { describe, expect, it } from "vitest";
import { formatOverviewReportHtml, formatOverviewReportText } from "../src/lib/overview-copy";

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
