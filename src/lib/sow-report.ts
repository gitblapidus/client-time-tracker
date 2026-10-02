import { PROJECT_TYPE_LABELS, roundHours } from "@/lib/calculations";
import { formatHours, formatSignedHours } from "@/lib/utils";

export type SowReportRow = {
  projectId: string;
  clientName: string;
  projectName: string;
  productionManager: string | null;
  quotedHours: number;
  developmentHours: number;
  deliveryLeadHours: number;
  technicalLeadershipHours: number;
  hoursUsed: number;
  hoursRemaining: number;
};

export function sowProjectLabel(row: Pick<SowReportRow, "clientName" | "projectName">) {
  return `${row.clientName} — ${row.projectName}`;
}

export function sowRemaining(quotedHours: number, hoursUsed: number) {
  return roundHours(quotedHours - hoursUsed);
}

export function sowReportTotals(rows: SowReportRow[]) {
  const quotedHours = roundHours(rows.reduce((sum, row) => sum + row.quotedHours, 0));
  const developmentHours = roundHours(rows.reduce((sum, row) => sum + row.developmentHours, 0));
  const deliveryLeadHours = roundHours(rows.reduce((sum, row) => sum + row.deliveryLeadHours, 0));
  const technicalLeadershipHours = roundHours(rows.reduce((sum, row) => sum + row.technicalLeadershipHours, 0));
  const hoursUsed = roundHours(rows.reduce((sum, row) => sum + row.hoursUsed, 0));
  const hoursRemaining = sowRemaining(quotedHours, hoursUsed);
  return { quotedHours, developmentHours, deliveryLeadHours, technicalLeadershipHours, hoursUsed, hoursRemaining };
}

const HEADERS = [
  "Project",
  "Quoted Hours",
  "Development",
  "Delivery Lead",
  "Technical Leadership",
  "Total",
  "Remaining",
];

function tsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.join("\t")).join("\n");
}

function sowTextRow(row: SowReportRow) {
  return [
    sowProjectLabel(row),
    formatHours(row.quotedHours),
    formatHours(row.developmentHours),
    formatHours(row.deliveryLeadHours),
    formatHours(row.technicalLeadershipHours),
    formatHours(row.hoursUsed),
    formatSignedHours(row.hoursRemaining),
  ];
}

function sowTotalTextRow(totals: ReturnType<typeof sowReportTotals>) {
  return [
    "Total",
    formatHours(totals.quotedHours),
    formatHours(totals.developmentHours),
    formatHours(totals.deliveryLeadHours),
    formatHours(totals.technicalLeadershipHours),
    formatHours(totals.hoursUsed),
    formatSignedHours(totals.hoursRemaining),
  ];
}

export function formatSowReportText(rows: SowReportRow[]) {
  if (rows.length === 0) return "";
  const totals = sowReportTotals(rows);
  return `${PROJECT_TYPE_LABELS.SOW.toUpperCase()} (${rows.length})\n${tsv([
    HEADERS,
    ...rows.map(sowTextRow),
    sowTotalTextRow(totals),
  ])}`;
}

export function formatSowReportHtml(rows: SowReportRow[]) {
  if (rows.length === 0) return "";
  const totals = sowReportTotals(rows);
  const cell = (value: string, align = "left") =>
    `<td style="padding:6px 10px;border:1px solid #94a3b8;text-align:${align};">${value}</td>`;
  const header = HEADERS.map((label, index) =>
    `<th style="padding:6px 10px;border:1px solid #94a3b8;text-align:${index === 0 ? "left" : "right"};background:#c7d3f5;">${label}</th>`,
  ).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${cell(sowProjectLabel(row))}${cell(formatHours(row.quotedHours), "right")}${cell(formatHours(row.developmentHours), "right")}${cell(formatHours(row.deliveryLeadHours), "right")}${cell(formatHours(row.technicalLeadershipHours), "right")}${cell(formatHours(row.hoursUsed), "right")}${cell(formatSignedHours(row.hoursRemaining), "right")}</tr>`,
    )
    .join("");
  const totalRow = `<tr style="background:#c7d3f5;font-weight:700;">${cell("Total")}${cell(formatHours(totals.quotedHours), "right")}${cell(formatHours(totals.developmentHours), "right")}${cell(formatHours(totals.deliveryLeadHours), "right")}${cell(formatHours(totals.technicalLeadershipHours), "right")}${cell(formatHours(totals.hoursUsed), "right")}${cell(formatSignedHours(totals.hoursRemaining), "right")}</tr>`;
  return `<table style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;"><thead><tr>${header}</tr></thead><tbody>${body}${totalRow}</tbody></table>`;
}
