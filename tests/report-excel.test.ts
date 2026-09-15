import { describe, expect, it } from "vitest";
import { buildReportWorkbook, managedExportLine } from "../src/lib/report-excel";

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

    const summary = workbook.getWorksheet("Summary");
    expect(summary?.getRow(4).getCell(2).numFmt).toBe("0.00");
    expect(summary?.getRow(5).getCell(2).numFmt).toBe('0.00"%"');
  });
});
