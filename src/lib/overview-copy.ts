import { formatYearMonth } from "@/lib/months";
import { PROJECT_TYPE_LABELS, roundHours } from "@/lib/calculations";
import { formatGroupingSpend, formatMoney, sumGroupingSpend } from "@/lib/burn-rate";
import { formatHours, formatSignedHours, nextMonthHint } from "@/lib/utils";

export type OverviewCopyRow = {
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
  currency?: string | null;
  totalSpend?: number | null;
};

const INK = "#0f1c2e";
const MUTED = "#64748b";
const NAVY = "#1e3a5f";
const BORDER = "#94a3b8";
const HEADER_BG = "#c7d3f5";
const WHITE = "#ffffff";
const PRIMARY = "#1d4ed8";
const SUCCESS = "#059669";
const SUCCESS_SOFT = "#ecfdf5";
const DANGER = "#dc2626";
const DANGER_SOFT = "#fef2f2";
const MUTED_BG = "#eef2f6";
const FONT = "Arial, Helvetica, sans-serif";

const managedHeaders = ["Month", "Client", "Project", "Project Manager", "Available", "Used", "Remaining", "Next Month"];
const tmHeaders = ["Month", "Client", "Project", "Project Manager", "Development Hours", "PM Hours", "Total"];
const weeklyManagedHeaders = ["Project", "Available", "Used", "Remaining", "Next Month"];
const weeklyManagedHeadersWithClient = ["Client", "Project", "Available", "Used", "Remaining", "Next Month"];
const weeklyTmSpendHeaders = ["Project", "Development Hours", "PM Hours", "Total", "Total Spend"];
const weeklyTmSpendHeadersWithClient = ["Client", "Project", "Development Hours", "PM Hours", "Total", "Total Spend"];
const WEEKLY_TM_SPEND_WIDTHS = ["36%", "16%", "14%", "14%", "20%"];
const WEEKLY_TM_SPEND_WIDTHS_WITH_CLIENT = ["20%", "22%", "14%", "12%", "12%", "20%"];

export type WeeklyStatusSummary = {
  totalAvailableHours: number;
  totalUsedHours: number;
  totalRemainingHours: number;
  utilizationPercent: number;
};

export function formatOverviewReportText(
  managed: OverviewCopyRow[],
  timeAndMaterials: OverviewCopyRow[],
  capitalTimeAndMaterials: OverviewCopyRow[] = [],
): string {
  const sections: string[] = [];
  if (managed.length > 0) {
    sections.push(
      `MANAGED SERVICE (${managed.length})\n${tsv([managedHeaders, ...managed.map(managedTextRow)])}`,
    );
  }
  if (timeAndMaterials.length > 0) {
    sections.push(
      `TIME & MATERIALS (${timeAndMaterials.length})\n${tsv([tmHeaders, ...timeAndMaterials.map(tmTextRow)])}`,
    );
  }
  if (capitalTimeAndMaterials.length > 0) {
    sections.push(
      `${PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS.toUpperCase()} (${capitalTimeAndMaterials.length})\n${tsv([tmHeaders, ...capitalTimeAndMaterials.map(tmTextRow)])}`,
    );
  }
  return sections.join("\n\n");
}

export function formatOverviewReportHtml(
  managed: OverviewCopyRow[],
  timeAndMaterials: OverviewCopyRow[],
  capitalTimeAndMaterials: OverviewCopyRow[] = [],
): string {
  const parts: string[] = [];
  if (managed.length > 0) {
    parts.push(sectionTableHtml("Managed Service", managed.length, managedHeaders, managed.map(managedHtmlRow), [4, 5, 6, 7]));
  }
  if (timeAndMaterials.length > 0) {
    parts.push(sectionTableHtml("Time & Materials", timeAndMaterials.length, tmHeaders, timeAndMaterials.map(tmHtmlRow), [4, 5, 6]));
  }
  if (capitalTimeAndMaterials.length > 0) {
    parts.push(
      sectionTableHtml(
        PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS,
        capitalTimeAndMaterials.length,
        tmHeaders,
        capitalTimeAndMaterials.map(tmHtmlRow),
        [4, 5, 6],
      ),
    );
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:${FONT};color:${INK};font-size:14px;line-height:1.45;">${parts.join(spacerRow(24))}</table>`;
}

export function formatWeeklyStatusReportText(
  heading: string,
  summary: WeeklyStatusSummary,
  managed: OverviewCopyRow[],
  timeAndMaterials: OverviewCopyRow[],
  capitalTimeAndMaterials: OverviewCopyRow[] = [],
  includeClient = false,
): string {
  const managedHeaders = includeClient ? weeklyManagedHeadersWithClient : weeklyManagedHeaders;
  const tmHeaders = includeClient ? weeklyTmSpendHeadersWithClient : weeklyTmSpendHeaders;
  const sections = [
    heading,
    "",
    tsv([
      ["Total Available", cell(summary.totalAvailableHours)],
      ["Total Used", cell(summary.totalUsedHours)],
      ["Total Remaining", cell(summary.totalRemainingHours)],
      ["Utilization", `${cell(summary.utilizationPercent)}%`],
    ]),
  ];
  if (managed.length > 0) {
    sections.push(
      "",
      `MANAGED SERVICE (${managed.length})\n${tsv([managedHeaders, ...managed.map((row) => weeklyManagedTextRow(row, includeClient)), weeklyManagedTotalTextRow(managed, includeClient)])}`,
    );
  }
  if (timeAndMaterials.length > 0) {
    sections.push(
      "",
      `TIME & MATERIALS (${timeAndMaterials.length})\n${tsv([tmHeaders, ...timeAndMaterials.map((row) => weeklyTmSpendTextRow(row, includeClient)), weeklyTmSpendTotalTextRow(timeAndMaterials, includeClient)])}`,
    );
  }
  if (capitalTimeAndMaterials.length > 0) {
    sections.push(
      "",
      `${PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS.toUpperCase()} (${capitalTimeAndMaterials.length})\n${tsv([tmHeaders, ...capitalTimeAndMaterials.map((row) => weeklyTmSpendTextRow(row, includeClient)), weeklyTmSpendTotalTextRow(capitalTimeAndMaterials, includeClient)])}`,
    );
  }
  return sections.join("\n").trim();
}

export function formatWeeklyStatusReportHtml(
  heading: string,
  summary: WeeklyStatusSummary,
  managed: OverviewCopyRow[],
  timeAndMaterials: OverviewCopyRow[],
  capitalTimeAndMaterials: OverviewCopyRow[] = [],
  includeClient = false,
): string {
  const managedHeaders = includeClient ? weeklyManagedHeadersWithClient : weeklyManagedHeaders;
  const tmHeaders = includeClient ? weeklyTmSpendHeadersWithClient : weeklyTmSpendHeaders;
  const tmWidths = includeClient ? WEEKLY_TM_SPEND_WIDTHS_WITH_CLIENT : WEEKLY_TM_SPEND_WIDTHS;
  const numericCols = includeClient ? [2, 3, 4, 5] : [1, 2, 3, 4];
  const parts = [
    `<tr><td style="font-size:20px;font-weight:700;color:${INK};padding:0 0 12px;">${escapeHtml(heading)}</td></tr>`,
    `<tr><td>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
        ${summaryHtmlRow("Total Available", cell(summary.totalAvailableHours))}
        ${summaryHtmlRow("Total Used", cell(summary.totalUsedHours))}
        ${summaryHtmlRow("Total Remaining", cell(summary.totalRemainingHours))}
        ${summaryHtmlRow("Utilization", `${cell(summary.utilizationPercent)}%`)}
      </table>
    </td></tr>`,
  ];
  if (managed.length > 0) {
    parts.push(sectionTableHtml(
      "Managed Service",
      managed.length,
      managedHeaders,
      [...managed.map((row) => weeklyManagedHtmlRow(row, includeClient)), weeklyManagedTotalHtmlRow(managed, includeClient)],
      numericCols,
      true,
    ));
  }
  if (timeAndMaterials.length > 0) {
    parts.push(
      sectionTableHtml(
        "Time & Materials",
        timeAndMaterials.length,
        tmHeaders,
        [...timeAndMaterials.map((row) => weeklyTmSpendHtmlRow(row, includeClient)), weeklyTmSpendTotalHtmlRow(timeAndMaterials, includeClient)],
        numericCols,
        true,
        tmWidths,
      ),
    );
  }
  if (capitalTimeAndMaterials.length > 0) {
    parts.push(
      sectionTableHtml(
        PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS,
        capitalTimeAndMaterials.length,
        tmHeaders,
        [...capitalTimeAndMaterials.map((row) => weeklyTmSpendHtmlRow(row, includeClient)), weeklyTmSpendTotalHtmlRow(capitalTimeAndMaterials, includeClient)],
        numericCols,
        true,
        tmWidths,
      ),
    );
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:${FONT};color:${INK};font-size:14px;line-height:1.45;">${parts.join(spacerRow(20))}</table>`;
}

function managedTextRow(row: OverviewCopyRow): string[] {
  const hint = nextMonthHint(row);
  const nextMonth = hint ? `${cell(row.hoursForNextMonth)} (${hint})` : cell(row.hoursForNextMonth);
  return [
    formatYearMonth(row.year, row.month),
    row.clientName,
    row.projectName,
    row.productionManager ?? "—",
    cell(row.hoursAvailable),
    cell(row.hoursUsed),
    remainingText(row.hoursRemaining),
    nextMonth,
  ];
}

function tmTextRow(row: OverviewCopyRow): string[] {
  return [
    formatYearMonth(row.year, row.month),
    row.clientName,
    row.projectName,
    row.productionManager ?? "—",
    cell(row.developmentHours),
    cell(row.pmHours),
    cell(row.hoursUsed),
  ];
}

function managedHtmlRow(row: OverviewCopyRow): string[] {
  const hint = nextMonthHint(row);
  const nextMonth = `<div style="font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(cell(row.hoursForNextMonth))}</div>${
    hint ? `<div style="margin-top:4px;font-size:11px;color:${PRIMARY};">${escapeHtml(hint)}</div>` : ""
  }`;
  return [
    escapeHtml(formatYearMonth(row.year, row.month)),
    escapeHtml(row.clientName),
    escapeHtml(row.projectName),
    escapeHtml(row.productionManager ?? "—"),
    escapeHtml(cell(row.hoursAvailable)),
    escapeHtml(cell(row.hoursUsed)),
    remainingBadgeHtml(row.hoursRemaining),
    nextMonth,
  ];
}

function tmHtmlRow(row: OverviewCopyRow): string[] {
  return [
    escapeHtml(formatYearMonth(row.year, row.month)),
    escapeHtml(row.clientName),
    escapeHtml(row.projectName),
    escapeHtml(row.productionManager ?? "—"),
    escapeHtml(cell(row.developmentHours)),
    escapeHtml(cell(row.pmHours)),
    `<span style="font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(cell(row.hoursUsed))}</span>`,
  ];
}

function weeklyManagedTextRow(row: OverviewCopyRow, includeClient = false): string[] {
  const full = managedTextRow(row);
  const compact = [full[2], full[4], full[5], full[6], full[7]];
  return includeClient ? [full[1], ...compact] : compact;
}

function weeklyTmTextRow(row: OverviewCopyRow, includeClient = false): string[] {
  const full = tmTextRow(row);
  const compact = [full[2], full[4], full[5], full[6]];
  return includeClient ? [full[1], ...compact] : compact;
}

function weeklyTmSpendTextRow(row: OverviewCopyRow, includeClient = false): string[] {
  return [...weeklyTmTextRow(row, includeClient), formatMoney(row.totalSpend, row.currency)];
}

function weeklyManagedHtmlRow(row: OverviewCopyRow, includeClient = false): string[] {
  const full = managedHtmlRow(row);
  const compact = [full[2], full[4], full[5], full[6], full[7]];
  return includeClient ? [full[1], ...compact] : compact;
}

function weeklyTmHtmlRow(row: OverviewCopyRow, includeClient = false): string[] {
  const full = tmHtmlRow(row);
  const compact = [full[2], full[4], full[5], full[6]];
  return includeClient ? [full[1], ...compact] : compact;
}

function weeklyTmSpendHtmlRow(row: OverviewCopyRow, includeClient = false): string[] {
  const full = weeklyTmHtmlRow(row, includeClient);
  return [...full, escapeHtml(formatMoney(row.totalSpend, row.currency))];
}

function weeklyManagedTotals(rows: OverviewCopyRow[]) {
  return {
    available: roundHours(rows.reduce((sum, row) => sum + (row.hoursAvailable ?? 0), 0)),
    used: roundHours(rows.reduce((sum, row) => sum + row.hoursUsed, 0)),
    remaining: roundHours(rows.reduce((sum, row) => sum + (row.hoursRemaining ?? 0), 0)),
    nextMonth: roundHours(rows.reduce((sum, row) => sum + (row.hoursForNextMonth ?? 0), 0)),
  };
}

function weeklyTmSpendTotals(rows: OverviewCopyRow[]) {
  return {
    development: roundHours(rows.reduce((sum, row) => sum + (row.developmentHours ?? 0), 0)),
    pm: roundHours(rows.reduce((sum, row) => sum + (row.pmHours ?? 0), 0)),
    total: roundHours(rows.reduce((sum, row) => sum + row.hoursUsed, 0)),
    ...sumGroupingSpend(rows),
  };
}

function weeklyManagedTotalTextRow(rows: OverviewCopyRow[], includeClient = false): string[] {
  const totals = weeklyManagedTotals(rows);
  const compact = ["Total", cell(totals.available), cell(totals.used), remainingText(totals.remaining), cell(totals.nextMonth)];
  return includeClient ? ["", ...compact] : compact;
}

function weeklyTmSpendTotalTextRow(rows: OverviewCopyRow[], includeClient = false): string[] {
  const totals = weeklyTmSpendTotals(rows);
  const compact = ["Total", cell(totals.development), cell(totals.pm), cell(totals.total), formatGroupingSpend(rows)];
  return includeClient ? ["", ...compact] : compact;
}

function weeklyManagedTotalHtmlRow(rows: OverviewCopyRow[], includeClient = false): string[] {
  const totals = weeklyManagedTotals(rows);
  const compact = [
    "Total",
    escapeHtml(cell(totals.available)),
    escapeHtml(cell(totals.used)),
    remainingBadgeHtml(totals.remaining),
    escapeHtml(cell(totals.nextMonth)),
  ];
  return includeClient ? ["", ...compact] : compact;
}

function weeklyTmSpendTotalHtmlRow(rows: OverviewCopyRow[], includeClient = false): string[] {
  const totals = weeklyTmSpendTotals(rows);
  const compact = [
    "Total",
    escapeHtml(cell(totals.development)),
    escapeHtml(cell(totals.pm)),
    escapeHtml(cell(totals.total)),
    escapeHtml(formatGroupingSpend(rows)),
  ];
  return includeClient ? ["", ...compact] : compact;
}

function summaryHtmlRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:4px 0;color:${MUTED};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</td>
    <td style="padding:4px 0;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${escapeHtml(value)}</td>
  </tr>`;
}

function sectionTableHtml(
  title: string,
  count: number,
  headers: string[],
  rows: string[][],
  numericCols: number[],
  emphasizeLastRow = false,
  columnWidths?: string[],
) {
  const numeric = new Set(numericCols);
  const lastIndex = rows.length - 1;
  const colgroup = columnWidths?.length
    ? `<colgroup>${columnWidths.map((width) => `<col width="${escapeHtml(width)}" style="width:${escapeHtml(width)};" />`).join("")}</colgroup>`
    : "";
  const head = headers
    .map((header, index) => {
      const align = numeric.has(index) ? "right" : "left";
      const width = columnWidths?.[index];
      const widthAttr = width ? ` width="${escapeHtml(width)}"` : "";
      const widthStyle = width ? `width:${width};` : "";
      return `<th${widthAttr} style="padding:8px 12px;text-align:${align};font-size:12px;font-weight:700;color:${NAVY};border-bottom:1px solid ${BORDER};${widthStyle}">${escapeHtml(header)}</th>`;
    })
    .join("");
  const body = rows
    .map((row, rowIndex) => {
      const totalRow = emphasizeLastRow && rowIndex === lastIndex;
      return `<tr>${row
        .map((value, index) => {
          const align = numeric.has(index) ? "right" : "left";
          const width = columnWidths?.[index];
          const widthAttr = width ? ` width="${escapeHtml(width)}"` : "";
          const widthStyle = width ? `width:${width};` : "";
          const totalStyle = totalRow ? `background:${HEADER_BG};font-weight:700;` : "";
          return `<td${widthAttr} style="padding:8px 12px;text-align:${align};border-bottom:1px solid ${BORDER};vertical-align:top;${widthStyle}${totalStyle}">${value}</td>`;
        })
        .join("")}</tr>`;
    })
    .join("");
  return `${groupHeadingHtml(title, count)}${spacerRow(12)}<tr><td>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:12px;background:${WHITE};border-collapse:collapse;table-layout:fixed;">
      ${colgroup}
      <thead><tr style="background:${HEADER_BG};">${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </td></tr>`;
}

function groupHeadingHtml(title: string, count: number): string {
  return `<tr><td style="background:${HEADER_BG};border:1px solid ${BORDER};border-radius:12px;padding:10px 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${NAVY};">${escapeHtml(title)} (${count})</td></tr>`;
}

function remainingText(value: number | null): string {
  if (value == null) return "—";
  return value === 0 ? formatHours(0) : formatSignedHours(value);
}

function remainingBadgeHtml(value: number | null): string {
  if (value == null) return "—";
  const bg = value < 0 ? DANGER_SOFT : value > 0 ? SUCCESS_SOFT : MUTED_BG;
  const color = value < 0 ? DANGER : value > 0 ? SUCCESS : MUTED;
  return `<span style="display:inline-block;background:${bg};color:${color};font-weight:600;padding:2px 6px;border-radius:4px;font-variant-numeric:tabular-nums;">${escapeHtml(remainingText(value))}</span>`;
}

function cell(value: number | null | undefined): string {
  return formatHours(value);
}

function tsv(rows: string[][]): string {
  return rows.map((row) => row.map(tsvCell).join("\t")).join("\n");
}

function tsvCell(value: string): string {
  if (!/[\t\n"]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function spacerRow(height: number, colSpan = 1): string {
  return `<tr><td colspan="${colSpan}" style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</td></tr>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
