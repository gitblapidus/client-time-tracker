import ExcelJS from "exceljs";
import { formatYearMonth } from "@/lib/months";
import { nextMonthHint } from "@/lib/utils";

export type ReportExportRow = {
  year: number;
  month: number;
  clientName: string;
  projectName: string;
  productionManager: string | null;
  projectType: string;
  monthlyHours: number | null;
  hoursAvailable: number | null;
  hoursUsed: number;
  developmentHours: number | null;
  pmHours: number | null;
  hoursRemaining: number | null;
  hoursForNextMonth: number | null;
};

export type ReportExportSummary = {
  totalAvailableHours: number;
  totalUsedHours: number;
  totalRemainingHours: number;
  averageMonthlyUsage: number;
  utilizationPercent: number;
};

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9D9D9" },
};
const THIN: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFA6A6A6" } };
const BORDERS: Partial<ExcelJS.Borders> = { left: THIN, right: THIN, top: THIN, bottom: THIN };
const HEADER_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 14, bold: true, color: { argb: "FF000000" } };
const DATA_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, color: { argb: "FF000000" } };
const SUMMARY_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 12, color: { argb: "FF000000" } };
const CARRYOVER_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, bold: true, color: { argb: "FF5B9BD5" } };
const OVERAGE_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF0000" } };
const NEGATIVE_FONT: Partial<ExcelJS.Font> = { name: "Calibri", size: 11, color: { argb: "FFFF0000" } };

export const managedHeaders = [
  "Month",
  "Client",
  "Project",
  "Project Manager",
  "Available",
  "Used",
  "Remaining",
  "Next Month",
  "CarryOver",
];
export const tmHeaders = ["Month", "Client", "Project", "Project Manager", "Development Hours", "PM Hours", "Total"];

export function managedExportLine(row: ReportExportRow) {
  return [
    formatYearMonth(row.year, row.month),
    row.clientName,
    row.projectName,
    row.productionManager,
    row.hoursAvailable,
    row.hoursUsed,
    row.hoursRemaining,
    row.hoursForNextMonth,
    nextMonthHint(row),
  ];
}

export function tmExportLine(row: ReportExportRow) {
  return [
    formatYearMonth(row.year, row.month),
    row.clientName,
    row.projectName,
    row.productionManager,
    row.developmentHours,
    row.pmHours,
    row.hoursUsed,
  ];
}

export function summaryExportLines(summary: ReportExportSummary) {
  return [
    ["Total Available", summary.totalAvailableHours],
    ["Total Used", summary.totalUsedHours],
    ["Total Remaining", summary.totalRemainingHours],
    ["Average Monthly Usage", summary.averageMonthlyUsage],
    ["Utilization %", summary.utilizationPercent],
  ] as Array<[string, number]>;
}

export function buildReportWorkbook(options: {
  managed: ReportExportRow[];
  timeAndMaterials: ReportExportRow[];
  summary: ReportExportSummary;
}) {
  const workbook = new ExcelJS.Workbook();
  styleSummarySheet(workbook.addWorksheet("Summary"), summaryExportLines(options.summary));
  styleManagedSheet(workbook.addWorksheet("Managed Service"), options.managed.map(managedExportLine));
  styleTmSheet(workbook.addWorksheet("Time & Materials"), options.timeAndMaterials.map(tmExportLine));
  return workbook;
}

function styleSummarySheet(sheet: ExcelJS.Worksheet, lines: Array<[string, number]>) {
  sheet.views = [{ showGridLines: false }];
  sheet.columns = [{ width: 28 }, { width: 28 }];
  lines.forEach(([label, value], index) => {
    const row = sheet.addRow([label, value]);
    row.eachCell((cell) => {
      cell.font = SUMMARY_FONT;
      cell.border = BORDERS;
    });
    if (index === 3) row.getCell(2).numFmt = "0.00";
    if (index === 4) row.getCell(2).numFmt = '0.00"%"';
  });
}

function styleManagedSheet(sheet: ExcelJS.Worksheet, lines: ReturnType<typeof managedExportLine>[]) {
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns = managedHeaders.map(() => ({ width: 22 }));
  const header = sheet.addRow(managedHeaders);
  header.height = 19;
  header.eachCell((cell, col) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDERS;
    cell.alignment = { horizontal: col <= 4 ? "left" : "center", vertical: "middle" };
  });
  lines.forEach((line) => {
    const row = sheet.addRow(line);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = BORDERS;
      if (col === 9) {
        const overage = typeof cell.value === "string" && cell.value.includes("overage");
        cell.font = overage ? OVERAGE_FONT : CARRYOVER_FONT;
        cell.alignment = { horizontal: "left" };
        return;
      }
      if (col >= 5 && col <= 8) {
        cell.alignment = { horizontal: "center" };
      }
      if (col === 7 && typeof cell.value === "number" && cell.value < 0) {
        cell.font = NEGATIVE_FONT;
        return;
      }
      cell.font = DATA_FONT;
    });
  });
}

function styleTmSheet(sheet: ExcelJS.Worksheet, lines: ReturnType<typeof tmExportLine>[]) {
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns = tmHeaders.map(() => ({ width: 22 }));
  const header = sheet.addRow(tmHeaders);
  header.height = 19;
  header.eachCell((cell, col) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDERS;
    cell.alignment = { horizontal: col <= 4 ? "left" : "center", vertical: "middle" };
  });
  lines.forEach((line) => {
    const row = sheet.addRow(line);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = DATA_FONT;
      cell.border = BORDERS;
      if (col >= 5) cell.alignment = { horizontal: "center" };
    });
  });
}
