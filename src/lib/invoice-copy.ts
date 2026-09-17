import { isManagedService, PROJECT_TYPE_LABELS } from "@/lib/calculations";
import { formatYearMonth } from "@/lib/months";
import { formatHours, formatSignedHours, nextMonthHint } from "@/lib/utils";

export type InvoiceCopyRow = {
  year: number;
  month: number;
  clientName: string;
  projectName: string;
  projectType: string;
  monthlyHours: number | null;
  hoursAvailable: number | null;
  hoursUsed: number;
  developmentHours: number | null;
  pmHours: number | null;
  hoursRemaining: number | null;
  hoursForNextMonth: number | null;
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

export function formatInvoiceCardText(row: InvoiceCopyRow): string {
  const lines = [
    `Client: ${row.clientName}`,
    `Month: ${formatYearMonth(row.year, row.month)}`,
    `Project: ${row.projectName}`,
  ];
  if (isManagedService(row.projectType)) {
    const hint = nextMonthHint(row);
    lines.push(
      `Available: ${formatHours(row.hoursAvailable)}`,
      `Used: ${formatHours(row.hoursUsed)}`,
      `Remaining: ${row.hoursRemaining == null ? "—" : formatSignedHours(row.hoursRemaining)}`,
      `Next Month: ${formatHours(row.hoursForNextMonth)}`,
    );
    if (hint) lines.push(hint);
  } else {
    lines.push(
      `Development Hours: ${formatHours(row.developmentHours)}`,
      `PM Hours: ${formatHours(row.pmHours)}`,
      `Total: ${formatHours(row.hoursUsed)}`,
    );
  }
  return lines.join("\n");
}

export function formatInvoiceReportText(
  managed: InvoiceCopyRow[],
  timeAndMaterials: InvoiceCopyRow[],
  capitalTimeAndMaterials: InvoiceCopyRow[] = [],
): string {
  const sections: string[] = [];
  if (managed.length > 0) {
    sections.push(`MANAGED SERVICE (${managed.length})\n\n${managed.map(formatInvoiceCardText).join("\n\n")}`);
  }
  if (timeAndMaterials.length > 0) {
    sections.push(`TIME & MATERIALS (${timeAndMaterials.length})\n\n${timeAndMaterials.map(formatInvoiceCardText).join("\n\n")}`);
  }
  if (capitalTimeAndMaterials.length > 0) {
    sections.push(
      `${PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS.toUpperCase()} (${capitalTimeAndMaterials.length})\n\n${capitalTimeAndMaterials.map(formatInvoiceCardText).join("\n\n")}`,
    );
  }
  return sections.join("\n\n");
}

export function formatInvoiceReportHtml(
  managed: InvoiceCopyRow[],
  timeAndMaterials: InvoiceCopyRow[],
  capitalTimeAndMaterials: InvoiceCopyRow[] = [],
): string {
  const parts: string[] = [];
  if (managed.length > 0) {
    parts.push(sectionHtml("Managed Service", managed.length, managed.map(managedCardHtml)));
  }
  if (timeAndMaterials.length > 0) {
    parts.push(sectionHtml("Time & Materials", timeAndMaterials.length, timeAndMaterials.map(tmCardHtml)));
  }
  if (capitalTimeAndMaterials.length > 0) {
    parts.push(
      sectionHtml(
        PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS,
        capitalTimeAndMaterials.length,
        capitalTimeAndMaterials.map(tmCardHtml),
      ),
    );
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:${FONT};color:${INK};font-size:14px;line-height:1.45;">${parts.join(spacerRow(24))}</table>`;
}

function sectionHtml(title: string, count: number, cards: string[]): string {
  return `${groupHeadingHtml(title, count)}${spacerRow(12)}${cardGridHtml(cards)}`;
}

function groupHeadingHtml(title: string, count: number): string {
  return `<tr><td style="background:${HEADER_BG};border:1px solid ${BORDER};border-radius:12px;padding:10px 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${NAVY};">${escapeHtml(title)} (${count})</td></tr>`;
}

function cardGridHtml(cards: string[]): string {
  const rows = chunk(cards, 3).map((row) => {
    const cells = [0, 1, 2].map((index) => {
      const card = row[index];
      const padding = index === 0 ? "0 8px 0 0" : index === 2 ? "0 0 0 8px" : "0 4px";
      return `<td width="33%" valign="top" style="padding:${padding};">${card ?? "&nbsp;"}</td>`;
    });
    return `<tr>${cells.join("")}</tr>`;
  });
  return `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join(spacerRow(16, 3))}</table></td></tr>`;
}

function managedCardHtml(row: InvoiceCopyRow): string {
  const hint = nextMonthHint(row);
  return cardHtml(row, [
    metricHtml("Available", escapeHtml(formatHours(row.hoursAvailable))),
    metricHtml("Used", escapeHtml(formatHours(row.hoursUsed))),
    metricHtml("Remaining", remainingBadgeHtml(row.hoursRemaining)),
    metricHtml(
      "Next Month",
      `<span style="font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(formatHours(row.hoursForNextMonth))}</span>${
        hint ? `<div style="margin-top:4px;font-size:11px;color:${PRIMARY};">${escapeHtml(hint)}</div>` : ""
      }`,
    ),
  ]);
}

function tmCardHtml(row: InvoiceCopyRow): string {
  return cardHtml(row, [
    metricHtml("Development Hours", escapeHtml(formatHours(row.developmentHours))),
    metricHtml("PM Hours", escapeHtml(formatHours(row.pmHours))),
    metricHtml("Total", `<span style="font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(formatHours(row.hoursUsed))}</span>`),
  ]);
}

function cardHtml(row: InvoiceCopyRow, metrics: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:12px;background:${WHITE};">
    <tr><td style="background:${HEADER_BG};border-bottom:1px solid ${BORDER};padding:16px 20px;">
      ${headerLineHtml("Client", row.clientName)}
      ${headerLineHtml("Month", formatYearMonth(row.year, row.month))}
      ${headerLineHtml("Project", row.projectName)}
    </td></tr>
    <tr><td style="padding:16px 20px;">${metrics.join("")}</td></tr>
  </table>`;
}

function headerLineHtml(label: string, value: string): string {
  return `<div style="margin:0 0 4px;font-size:14px;color:${INK};"><span style="color:${MUTED};font-weight:500;">${escapeHtml(label)}: </span><span style="font-weight:700;">${escapeHtml(value)}</span></div>`;
}

function metricHtml(label: string, valueHtml: string): string {
  return `<div style="margin:0 0 12px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};margin:0 0 4px;">${escapeHtml(label)}</div>
    <div style="font-size:14px;color:${INK};font-variant-numeric:tabular-nums;">${valueHtml}</div>
  </div>`;
}

function remainingBadgeHtml(value: number | null): string {
  if (value == null) return "—";
  const bg = value < 0 ? DANGER_SOFT : value > 0 ? SUCCESS_SOFT : MUTED_BG;
  const color = value < 0 ? DANGER : value > 0 ? SUCCESS : MUTED;
  return `<span style="display:inline-block;background:${bg};color:${color};font-weight:600;padding:2px 6px;border-radius:4px;font-variant-numeric:tabular-nums;">${escapeHtml(formatSignedHours(value))}</span>`;
}

function spacerRow(height: number, colSpan = 1): string {
  return `<tr><td colspan="${colSpan}" style="height:${height}px;line-height:${height}px;font-size:1px;">&nbsp;</td></tr>`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
