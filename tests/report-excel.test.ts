import { describe, expect, it } from "vitest";
import { buildBurnProject, buildBurnTotals } from "../src/lib/burn-rate";
import { buildBurnRateWorkbook, buildReportWorkbook, buildSowWorkbook, managedExportLine } from "../src/lib/report-excel";

const managedRow = {
  year: 2026,
  month: 4,
  clientName: "Acme Corporation",
  projectName: "Application Support",
  productionManager: "Morgan Blake",
  projectType: "MANAGED_SERVICE",
  monthlyHours: 40,
  hoursAvailable: 49,
  hoursUsed: 75,
  developmentHours: null,
  pmHours: null,
  hoursRemaining: -29.5,
  hoursForNextMonth: 10.5,
};

describe("Excel report formatting", () => {
  it("includes a CarryOver column from the next-month hint", () => {
    const line = managedExportLine(managedRow);
    expect(line[8]).toBe("29.5 hrs overage deducted");
  });

  it("matches the sample workbook structure and styles", async () => {
    const workbook = buildReportWorkbook({
      managed: [managedRow],
      timeAndMaterials: [],
      summary: {
        totalAvailableHours: 49,
        totalUsedHours: 75,
        totalRemainingHours: -26.5,
        averageMonthlyUsage: 75,
        utilizationPercent: 153.1,
      },
    });
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Summary",
      "Managed Service",
      "Time & Materials",
      "Capital-Time & Material",
    ]);

    const managed = workbook.getWorksheet("Managed Service");
    expect(managed).toBeDefined();
    expect(managed?.getRow(1).getCell(1).value).toBe("Month");
    expect(managed?.getRow(1).getCell(9).value).toBe("CarryOver");
    expect(managed?.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(managed?.getRow(1).getCell(1).font?.size).toBe(14);
    const headerFill = managed?.getRow(1).getCell(1).fill as { fgColor?: { argb?: string } } | undefined;
    expect(headerFill?.fgColor?.argb).toBe("FFD9D9D9");
    expect(managed?.getRow(1).height).toBe(19);
    expect(managed?.getRow(2).getCell(5).alignment?.horizontal).toBe("center");
    expect(managed?.getRow(2).getCell(7).font?.color?.argb).toBe("FFFF0000");
    expect(managed?.getRow(2).getCell(9).value).toBe("29.5 hrs overage deducted");
    expect(managed?.getRow(2).getCell(9).font?.bold).toBe(true);
    expect(managed?.getRow(2).getCell(9).font?.color?.argb).toBe("FFFF0000");
    expect(managed?.views?.[0]).toMatchObject({ showGridLines: false, state: "frozen", ySplit: 1 });

    const carryoverWorkbook = buildReportWorkbook({
      managed: [{ ...managedRow, hoursAvailable: 59, hoursUsed: 40, hoursRemaining: 19, hoursForNextMonth: 59 }],
      timeAndMaterials: [],
      summary: {
        totalAvailableHours: 59,
        totalUsedHours: 40,
        totalRemainingHours: 19,
        averageMonthlyUsage: 40,
        utilizationPercent: 67.8,
      },
    });
    const carryoverCell = carryoverWorkbook.getWorksheet("Managed Service")?.getRow(2).getCell(9);
    expect(carryoverCell?.value).toBe("Includes 19 hrs carryover");
    expect(carryoverCell?.font?.color?.argb).toBe("FF5B9BD5");

    const compactWorkbook = buildReportWorkbook({
      managed: [managedRow],
      timeAndMaterials: [],
      summary: {
        totalAvailableHours: 49,
        totalUsedHours: 75,
        totalRemainingHours: -26.5,
        averageMonthlyUsage: 75,
        utilizationPercent: 153.1,
      },
      compact: true,
    });
    const compactManaged = compactWorkbook.getWorksheet("Managed Service");
    expect(compactManaged?.getRow(1).getCell(1).value).toBe("Project");
    expect(compactManaged?.getRow(1).getCell(6).value).toBe("CarryOver");
    expect(compactManaged?.getRow(2).getCell(1).value).toBe("Application Support");
    expect(compactManaged?.getRow(2).getCell(4).font?.color?.argb).toBe("FFFF0000");

    const compactTmWorkbook = buildReportWorkbook({
      managed: [],
      timeAndMaterials: [
        {
          year: 2026,
          month: 8,
          clientName: "DBNEXT",
          projectName: "DBN_Additional Monthly Hours",
          productionManager: "Brad Lapidus",
          projectType: "TIME_AND_MATERIALS",
          monthlyHours: null,
          hoursAvailable: null,
          hoursUsed: 23.5,
          developmentHours: 19,
          pmHours: 4.5,
          hoursRemaining: null,
          hoursForNextMonth: null,
          currency: "USD",
          totalSpend: 1880,
        },
      ],
      summary: {
        totalAvailableHours: 0,
        totalUsedHours: 23.5,
        totalRemainingHours: 0,
        averageMonthlyUsage: 23.5,
        utilizationPercent: 0,
      },
      compact: true,
    });
    const compactTm = compactTmWorkbook.getWorksheet("Time & Materials");
    expect(compactTm?.getRow(1).getCell(5).value).toBe("Total Spend");
    expect(compactTm?.getRow(2).getCell(5).value).toBe("$1,880");
    expect(compactTm?.getRow(3).getCell(1).value).toBe("Total");
    expect(compactTm?.getRow(3).getCell(5).value).toBe("$1,880");

    const compactCapitalWorkbook = buildReportWorkbook({
      managed: [],
      timeAndMaterials: [],
      capitalTimeAndMaterials: [
        {
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
        },
      ],
      summary: {
        totalAvailableHours: 0,
        totalUsedHours: 15,
        totalRemainingHours: 0,
        averageMonthlyUsage: 15,
        utilizationPercent: 0,
      },
      compact: true,
    });
    const compactCapital = compactCapitalWorkbook.getWorksheet("Capital-Time & Material");
    expect(compactCapital?.getRow(1).getCell(5).value).toBe("Total Spend");
    expect(compactCapital?.getRow(2).getCell(5).value).toBe("1,575 €");
    expect(compactCapital?.getRow(3).getCell(1).value).toBe("Total");
    expect(compactCapital?.getRow(3).getCell(5).value).toBe("1,575 €");

    const summary = workbook.getWorksheet("Summary");
    expect(summary?.getRow(4).getCell(2).numFmt).toBe("0.00");
    expect(summary?.getRow(5).getCell(2).numFmt).toBe('0.00"%"');
  });

  it("builds a burn rate workbook with grouped metric fills and header totals", () => {
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
    const totals = buildBurnTotals([project]);
    const workbook = buildBurnRateWorkbook([project], totals);
    const sheet = workbook.getWorksheet("Burn Rate");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(4).value).toBe("Estimate (Hr)\n43");
    expect(sheet?.getRow(1).getCell(5).value).toBe("Estimate (cost)\n3,720 €");
    expect(sheet?.getRow(1).getCell(6).value).toBe("Actual\n28");
    expect(sheet?.getRow(1).getCell(7).value).toBe("Actual (Spend)\n2,400 €");
    expect(sheet?.getRow(1).getCell(8).value).toBe("Remaining (Hr)\n15");
    expect(sheet?.getRow(1).getCell(9).value).toBe("Remaining (Spend)\n1,320 €");
    expect(sheet?.getRow(2).getCell(2).value).toBe("Total");
    expect(sheet?.getRow(2).getCell(4).value).toBe(43);
    expect(sheet?.getRow(3).getCell(2).value).toBe("PM");
    expect(sheet?.getRow(4).getCell(2).value).toBe("Dev");
    expect(sheet?.getRow(3).getCell(4).value).toBe(7);
    expect(sheet?.getRow(4).getCell(6).value).toBe(24);
    const totalFill = sheet?.getRow(2).getCell(2).fill as { fgColor?: { argb?: string } } | undefined;
    expect(totalFill?.fgColor?.argb).toBe("FFC7D3F5");
    const estimateFill = sheet?.getRow(1).getCell(4).fill as { fgColor?: { argb?: string } } | undefined;
    const actualFill = sheet?.getRow(1).getCell(6).fill as { fgColor?: { argb?: string } } | undefined;
    const remainingFill = sheet?.getRow(1).getCell(8).fill as { fgColor?: { argb?: string } } | undefined;
    expect(estimateFill?.fgColor?.argb).toBe("FFEEF2F6");
    expect(actualFill?.fgColor?.argb).toBe("FFECFDF5");
    expect(remainingFill?.fgColor?.argb).toBe("FFFFFBEB");
  });
});

describe("SOW Excel report", () => {
  it("exports quoted hours, role hours, total, and remaining", async () => {
    const workbook = buildSowWorkbook([
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
    ]);
    const sheet = workbook.getWorksheet("SOW");
    expect(sheet).toBeDefined();
    expect(sheet?.getRow(1).getCell(1).value).toBe("Project");
    expect(sheet?.getRow(1).getCell(2).value).toBe("Quoted Hours");
    expect(sheet?.getRow(1).getCell(3).value).toBe("Development");
    expect(sheet?.getRow(1).getCell(4).value).toBe("Delivery Lead");
    expect(sheet?.getRow(1).getCell(5).value).toBe("Technical Leadership");
    expect(sheet?.getRow(1).getCell(6).value).toBe("Total");
    expect(sheet?.getRow(1).getCell(7).value).toBe("Remaining");
    expect(sheet?.getRow(2).getCell(1).value).toBe("Acme — SOW Build");
    expect(sheet?.getRow(2).getCell(3).value).toBe(20);
    expect(sheet?.getRow(2).getCell(6).value).toBe(30);
    expect(sheet?.getRow(2).getCell(7).value).toBe(50);
    expect(sheet?.getRow(3).getCell(7).font?.color?.argb).toBe("FFFF0000");
    expect(sheet?.getRow(4).getCell(1).value).toBe("Total");
    expect(sheet?.getRow(4).getCell(2).value).toBe(100);
    expect(sheet?.getRow(4).getCell(3).value).toBe(38);
    expect(sheet?.getRow(4).getCell(6).value).toBe(55);
    expect(sheet?.getRow(4).getCell(7).value).toBe(45);
  });
});
