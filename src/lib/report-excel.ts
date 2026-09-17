import ExcelJS from "exceljs";
import type { BurnProject, BurnTotals } from "@/lib/burn-rate";
import { formatMoney, sortBurnProjects } from "@/lib/burn-rate";
import { PROJECT_TYPE_LABELS } from "@/lib/calculations";
import { formatYearMonth } from "@/lib/months";
import { formatHours, nextMonthHint } from "@/lib/utils";

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
export const weeklyManagedHeaders = [
  "Project",
  "Available",
  "Used",
  "Remaining",
  "Next Month",
  "CarryOver",
];
export const weeklyTmHeaders = ["Project", "Development Hours", "PM Hours", "Total"];
export const tmHeaders = ["Month", "Client", "Project", "Project Manager", "Development Hours", "PM Hours", "Total"];

export function managedExportLine(row: ReportExportRow, compact = false) {
  const line = [
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
  return compact ? [line[2], line[4], line[5], line[6], line[7], line[8]] : line;
}

export function tmExportLine(row: ReportExportRow, compact = false) {
  const line = [
    formatYearMonth(row.year, row.month),
    row.clientName,
    row.projectName,
    row.productionManager,
    row.developmentHours,
    row.pmHours,
    row.hoursUsed,
  ];
  return compact ? [line[2], line[4], line[5], line[6]] : line;
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
  capitalTimeAndMaterials?: ReportExportRow[];
  summary: ReportExportSummary;
  compact?: boolean;
}) {
  const compact = options.compact ?? false;
  const capitalTimeAndMaterials = options.capitalTimeAndMaterials ?? [];
  const workbook = new ExcelJS.Workbook();
  styleSummarySheet(workbook.addWorksheet("Summary"), summaryExportLines(options.summary));
  styleManagedSheet(
    workbook.addWorksheet("Managed Service"),
    options.managed.map((row) => managedExportLine(row, compact)),
    compact,
  );
  styleTmSheet(
    workbook.addWorksheet("Time & Materials"),
    options.timeAndMaterials.map((row) => tmExportLine(row, compact)),
    compact,
  );
  styleTmSheet(
    workbook.addWorksheet(PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS),
    capitalTimeAndMaterials.map((row) => tmExportLine(row, compact)),
    compact,
  );
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

function styleManagedSheet(
  sheet: ExcelJS.Worksheet,
  lines: ReturnType<typeof managedExportLine>[],
  compact = false,
) {
  const headers = compact ? weeklyManagedHeaders : managedHeaders;
  const remainingCol = compact ? 4 : 7;
  const carryoverCol = compact ? 6 : 9;
  const numericStart = compact ? 2 : 5;
  const numericEnd = compact ? 5 : 8;
  const leftAlignThrough = compact ? 1 : 4;
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns = headers.map(() => ({ width: 22 }));
  const header = sheet.addRow(headers);
  header.height = 19;
  header.eachCell((cell, col) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDERS;
    cell.alignment = { horizontal: col <= leftAlignThrough ? "left" : "center", vertical: "middle" };
  });
  lines.forEach((line) => {
    const row = sheet.addRow(line);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = BORDERS;
      if (col === carryoverCol) {
        const overage = typeof cell.value === "string" && cell.value.includes("overage");
        cell.font = overage ? OVERAGE_FONT : CARRYOVER_FONT;
        cell.alignment = { horizontal: "left" };
        return;
      }
      if (col >= numericStart && col <= numericEnd) {
        cell.alignment = { horizontal: "center" };
      }
      if (col === remainingCol && typeof cell.value === "number" && cell.value < 0) {
        cell.font = NEGATIVE_FONT;
        return;
      }
      cell.font = DATA_FONT;
    });
  });
}

function styleTmSheet(sheet: ExcelJS.Worksheet, lines: ReturnType<typeof tmExportLine>[], compact = false) {
  const headers = compact ? weeklyTmHeaders : tmHeaders;
  const leftAlignThrough = compact ? 1 : 4;
  const numericStart = compact ? 2 : 5;
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns = headers.map(() => ({ width: 22 }));
  const header = sheet.addRow(headers);
  header.height = 19;
  header.eachCell((cell, col) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.border = BORDERS;
    cell.alignment = { horizontal: col <= leftAlignThrough ? "left" : "center", vertical: "middle" };
  });
  lines.forEach((line) => {
    const row = sheet.addRow(line);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = DATA_FONT;
      cell.border = BORDERS;
      if (col >= numericStart) cell.alignment = { horizontal: "center" };
    });
  });
}

const ESTIMATE_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2F6" } };
const ACTUAL_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
const REMAINING_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
const GROUP_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC7D3F5" } };

export function buildBurnRateWorkbook(projects: BurnProject[], totals: BurnTotals) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Burn Rate");
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns = [
    { width: 32 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
    { width: 18 },
    { width: 16 },
    { width: 20 },
  ];

  const header = sheet.addRow([
    "Project",
    "Ticket",
    "Status",
    "Estimate (Hr)",
    "Estimate (cost)",
    "Actual",
    "Actual (Spend)",
    "Remaining (Hr)",
    "Remaining (Spend)",
  ]);
  header.height = 36;
  const fills = [null, null, null, ESTIMATE_FILL, ESTIMATE_FILL, ACTUAL_FILL, ACTUAL_FILL, REMAINING_FILL, REMAINING_FILL];
  header.eachCell((cell, col) => {
    cell.font = HEADER_FONT;
    cell.border = BORDERS;
    cell.alignment = { horizontal: col <= 3 ? "left" : "right", vertical: "middle", wrapText: true };
    const fill = fills[col - 1];
    cell.fill = fill ?? HEADER_FILL;
  });
  header.getCell(4).value = `Estimate (Hr)\n${formatHours(totals.estimateHours)}`;
  header.getCell(5).value = `Estimate (cost)\n${formatMoney(totals.estimateCost, totals.currency)}`;
  header.getCell(6).value = `Actual\n${formatHours(totals.actualHours)}`;
  header.getCell(7).value = `Actual (Spend)\n${formatMoney(totals.actualSpend, totals.currency)}`;
  header.getCell(8).value = `Remaining (Hr)\n${formatHours(totals.remainingHours)}`;
  header.getCell(9).value = `Remaining (Spend)\n${formatMoney(totals.remainingSpend, totals.currency)}`;

  sortBurnProjects(projects).forEach((project) => {
    const subtitle = project.subtitle ?? project.clientName;
    const totalRow = sheet.addRow([
      `${project.title}\n${subtitle}`,
      "Total",
      project.total.status,
      project.total.estimateHours,
      formatMoney(project.total.estimateCost, project.currency),
      project.total.actualHours,
      formatMoney(project.total.actualSpend, project.currency),
      project.total.remainingHours,
      formatMoney(project.total.remainingSpend, project.currency),
    ]);
    const pmRow = sheet.addRow([
      "",
      project.pm.ticket,
      "",
      project.pm.estimateHours,
      formatMoney(project.pm.estimateCost, project.currency),
      project.pm.actualHours,
      formatMoney(project.pm.actualSpend, project.currency),
      project.pm.remainingHours,
      formatMoney(project.pm.remainingSpend, project.currency),
    ]);
    const devRow = sheet.addRow([
      "",
      project.dev.ticket,
      "",
      project.dev.estimateHours,
      formatMoney(project.dev.estimateCost, project.currency),
      project.dev.actualHours,
      formatMoney(project.dev.actualSpend, project.currency),
      project.dev.remainingHours,
      formatMoney(project.dev.remainingSpend, project.currency),
    ]);
    sheet.mergeCells(totalRow.number, 1, devRow.number, 1);
    [totalRow, pmRow, devRow].forEach((row, index) => {
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = BORDERS;
        cell.font = col === 1 || index === 0 ? { ...DATA_FONT, bold: true } : DATA_FONT;
        cell.alignment = {
          horizontal: col <= 3 ? "left" : "right",
          vertical: col === 1 ? "top" : "middle",
          wrapText: col === 1,
        };
        const fill = index === 0 && col !== 1 ? GROUP_FILL : fills[col - 1];
        if (fill) cell.fill = fill;
      });
    });
  });

  return workbook;
}
