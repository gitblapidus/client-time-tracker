import { describe, expect, it } from "vitest";
import {
  buildBurnLine,
  buildBurnProject,
  buildBurnTotals,
  formatBurnRateReportText,
  formatMoney,
  sortBurnProjects,
  splitProjectTitle,
} from "../src/lib/burn-rate";

describe("burn rate", () => {
  it("matches the System Upgrade estimate, actual, and remaining figures", () => {
    const project = buildBurnProject({
      projectId: "p1",
      projectName: "System Upgrade (Maria DB, OpenSearch, & Valkey)",
      clientName: "VANDERSCHOOTEN",
      currency: "EUR",
      productionManager: "Brad Lapidus",
      estimatedPmHours: 7,
      pmRate: 120,
      estimatedDevHours: 36,
      devRate: 80,
      actualPmHours: 4,
      actualDevHours: 24,
    });

    expect(project.title).toBe("System Upgrade");
    expect(project.subtitle).toBe("Maria DB, OpenSearch, & Valkey");
    expect(project.pm).toMatchObject({
      ticket: "PM",
      estimateHours: 7,
      estimateCost: 840,
      actualHours: 4,
      actualSpend: 480,
      remainingHours: 3,
      remainingSpend: 360,
      status: "In Progress",
    });
    expect(project.dev).toMatchObject({
      ticket: "Dev",
      estimateHours: 36,
      estimateCost: 2880,
      actualHours: 24,
      actualSpend: 1920,
      remainingHours: 12,
      remainingSpend: 960,
      status: "In Progress",
    });
    expect(project.total).toMatchObject({
      estimateHours: 43,
      estimateCost: 3720,
      actualHours: 28,
      actualSpend: 2400,
      remainingHours: 15,
      remainingSpend: 1320,
      status: "Not Started",
    });
    expect(formatMoney(3720, "EUR")).toBe("3,720 €");
    expect(formatMoney(-600, "USD")).toBe("-$600");
    expect(formatMoney(-600, "EUR")).toBe("-600 €");
  });

  it("marks tickets complete or not started from hours, and keeps remaining negative when over estimate", () => {
    expect(buildBurnLine("Dev", 10, 100, 0).status).toBe("Not Started");
    expect(buildBurnLine("Dev", 10, 100, 10).status).toBe("Complete");
    expect(buildBurnLine("Dev", 10, 100, 12).status).toBe("In Progress");
    expect(buildBurnLine("Dev", 10, 100, 12).remainingHours).toBe(-2);
    expect(buildBurnLine("Dev", 10, 100, 12).remainingSpend).toBe(-200);
  });

  it("uses a stored project status on the total line", () => {
    const project = buildBurnProject({
      projectId: "p1",
      projectName: "KION Capital ERP",
      clientName: "KION",
      currency: "EUR",
      productionManager: null,
      estimatedPmHours: 7,
      pmRate: 120,
      estimatedDevHours: 36,
      devRate: 80,
      actualPmHours: 4,
      actualDevHours: 24,
      status: "UAT",
    });
    expect(project.total.status).toBe("UAT");
  });

  it("sorts projects by status from pending deployment to complete", () => {
    const sample = (id: string, status: "Pending Deployment" | "UAT" | "In Progress" | "Not Started" | "Complete") =>
      buildBurnProject({
        projectId: id,
        projectName: id,
        clientName: "Acme",
        currency: "USD",
        productionManager: null,
        estimatedPmHours: 1,
        pmRate: 100,
        estimatedDevHours: 1,
        devRate: 100,
        actualPmHours: 0,
        actualDevHours: 0,
        status,
      });
    expect(
      sortBurnProjects([
        sample("complete", "Complete"),
        sample("not-started", "Not Started"),
        sample("uat", "UAT"),
        sample("in-progress", "In Progress"),
        sample("pending", "Pending Deployment"),
      ]).map((project) => project.projectId),
    ).toEqual(["pending", "uat", "in-progress", "not-started", "complete"]);
  });

  it("splits a parenthetical subtitle from the project name", () => {
    expect(splitProjectTitle("VDS_System Upgrade (MariaDB, OpenSearch & Valkey)")).toEqual({
      title: "VDS_System Upgrade",
      subtitle: "MariaDB, OpenSearch & Valkey",
    });
    expect(splitProjectTitle("KION Capital ERP")).toEqual({
      title: "KION Capital ERP",
      subtitle: null,
    });
  });

  it("omits money totals when currencies are mixed", () => {
    const euro = buildBurnProject({
      projectId: "a",
      projectName: "Alpha",
      clientName: "KION",
      currency: "EUR",
      productionManager: null,
      estimatedPmHours: 1,
      pmRate: 100,
      estimatedDevHours: 1,
      devRate: 100,
      actualPmHours: 0,
      actualDevHours: 0,
    });
    const usd = buildBurnProject({
      projectId: "b",
      projectName: "Beta",
      clientName: "Acme",
      currency: "USD",
      productionManager: null,
      estimatedPmHours: 1,
      pmRate: 100,
      estimatedDevHours: 1,
      devRate: 100,
      actualPmHours: 0,
      actualDevHours: 0,
    });
    expect(buildBurnTotals([euro, usd]).currency).toBeNull();
    expect(buildBurnTotals([euro]).currency).toBe("EUR");
  });

  it("formats a copyable burn rate table", () => {
    const project = buildBurnProject({
      projectId: "p1",
      projectName: "System Upgrade (Maria DB, OpenSearch, & Valkey)",
      clientName: "VANDERSCHOOTEN",
      currency: "EUR",
      productionManager: null,
      estimatedPmHours: 7,
      pmRate: 120,
      estimatedDevHours: 36,
      devRate: 80,
      actualPmHours: 4,
      actualDevHours: 24,
      status: "In Progress",
    });
    const text = formatBurnRateReportText([project], buildBurnTotals([project]));
    expect(text).toContain("BURN RATE (1)");
    expect(text).toContain("Estimate (Hr)");
    expect(text).toContain("System Upgrade\tTotal\tIn Progress\t43\t3,720 €");
    expect(text).toContain("\tPM\t\t7\t840 €");
    expect(text).toContain("Maria DB, OpenSearch, & Valkey\tDev\t\t36\t2,880 €");
  });
});
