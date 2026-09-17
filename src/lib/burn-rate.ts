import { currencySymbol, roundHours } from "@/lib/calculations";
import { formatHours } from "@/lib/utils";

export const BURN_TICKETS = ["PM", "Dev"] as const;
export type BurnTicket = (typeof BURN_TICKETS)[number];

export const BURN_STATUSES = ["Not Started", "In Progress", "UAT", "Pending Deployment", "Complete"] as const;
export type BurnStatus = (typeof BURN_STATUSES)[number];

export function parseBurnStatus(value: string | null | undefined): BurnStatus {
  return BURN_STATUSES.includes(value as BurnStatus) ? (value as BurnStatus) : "Not Started";
}

export type BurnLine = {
  ticket: BurnTicket;
  estimateHours: number;
  estimateCost: number;
  actualHours: number;
  actualSpend: number;
  remainingHours: number;
  remainingSpend: number;
  status: BurnStatus;
};

export type BurnProject = {
  projectId: string;
  projectName: string;
  title: string;
  subtitle: string | null;
  clientName: string;
  currency: string;
  productionManager: string | null;
  pm: BurnLine;
  dev: BurnLine;
  total: Omit<BurnLine, "ticket">;
};

export type BurnTotals = Omit<BurnLine, "ticket" | "status"> & {
  currency: string | null;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null || Number.isNaN(value) || !currency) {
    return "—";
  }
  const rounded = roundMoney(value);
  const amount = Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = rounded < 0 ? "-" : "";
  const symbol = currencySymbol(currency);
  return currency === "EUR" ? `${sign}${amount} ${symbol}` : `${sign}${symbol}${amount}`;
}

export function splitProjectTitle(name: string): { title: string; subtitle: string | null } {
  const match = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (match?.[1] && match[2]) {
    return { title: match[1].trim(), subtitle: match[2].trim() };
  }
  return { title: name, subtitle: null };
}

export function burnStatus(estimateHours: number, actualHours: number, remainingHours: number): BurnStatus {
  if (actualHours <= 0) {
    return "Not Started";
  }
  if (remainingHours === 0) {
    return "Complete";
  }
  return "In Progress";
}

export function buildBurnLine(ticket: BurnTicket, estimateHours: number, rate: number, actualHours: number): BurnLine {
  const hoursEstimate = roundHours(Math.max(estimateHours, 0));
  const hoursActual = roundHours(Math.max(actualHours, 0));
  const estimateCost = roundMoney(hoursEstimate * rate);
  const actualSpend = roundMoney(hoursActual * rate);
  const remainingHours = roundHours(hoursEstimate - hoursActual);
  const remainingSpend = roundMoney(estimateCost - actualSpend);
  return {
    ticket,
    estimateHours: hoursEstimate,
    estimateCost,
    actualHours: hoursActual,
    actualSpend,
    remainingHours,
    remainingSpend,
    status: burnStatus(hoursEstimate, hoursActual, remainingHours),
  };
}

export function sumBurnLines(lines: Array<Omit<BurnLine, "ticket" | "status">>): Omit<BurnLine, "ticket" | "status"> {
  return {
    estimateHours: roundHours(lines.reduce((sum, line) => sum + line.estimateHours, 0)),
    estimateCost: roundMoney(lines.reduce((sum, line) => sum + line.estimateCost, 0)),
    actualHours: roundHours(lines.reduce((sum, line) => sum + line.actualHours, 0)),
    actualSpend: roundMoney(lines.reduce((sum, line) => sum + line.actualSpend, 0)),
    remainingHours: roundHours(lines.reduce((sum, line) => sum + line.remainingHours, 0)),
    remainingSpend: roundMoney(lines.reduce((sum, line) => sum + line.remainingSpend, 0)),
  };
}

export function buildBurnProject(input: {
  projectId: string;
  projectName: string;
  clientName: string;
  currency: string;
  productionManager: string | null;
  estimatedPmHours: number;
  pmRate: number;
  estimatedDevHours: number;
  devRate: number;
  actualPmHours: number;
  actualDevHours: number;
  status?: string | null;
}): BurnProject {
  const parsed = splitProjectTitle(input.projectName);
  const pm = buildBurnLine("PM", input.estimatedPmHours, input.pmRate, input.actualPmHours);
  const dev = buildBurnLine("Dev", input.estimatedDevHours, input.devRate, input.actualDevHours);
  const total = sumBurnLines([pm, dev]);
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    title: parsed.title,
    subtitle: parsed.subtitle ?? input.clientName,
    clientName: input.clientName,
    currency: input.currency,
    productionManager: input.productionManager,
    pm,
    dev,
    total: {
      ...total,
      status: parseBurnStatus(input.status),
    },
  };
}

export const BURN_STATUS_SORT_ORDER: Record<BurnStatus, number> = {
  "Pending Deployment": 0,
  UAT: 1,
  "In Progress": 2,
  "Not Started": 3,
  Complete: 4,
};

export function sortBurnProjects(projects: BurnProject[]): BurnProject[] {
  return [...projects].sort(
    (a, b) => BURN_STATUS_SORT_ORDER[a.total.status] - BURN_STATUS_SORT_ORDER[b.total.status],
  );
}

export function buildBurnTotals(projects: BurnProject[]): BurnTotals {
  const currencies = [...new Set(projects.map((project) => project.currency))];
  return {
    ...sumBurnLines(projects.map((project) => project.total)),
    currency: currencies.length === 1 ? (currencies[0] ?? null) : null,
  };
}

const COPY_HEADERS = [
  "Project",
  "Ticket",
  "Status",
  "Estimate (Hr)",
  "Estimate (cost)",
  "Actual",
  "Actual (Spend)",
  "Remaining (Hr)",
  "Remaining (Spend)",
];

export function formatBurnRateReportText(projects: BurnProject[], totals: BurnTotals): string {
  if (projects.length === 0) return "";
  const ordered = sortBurnProjects(projects);
  const rows = [
    COPY_HEADERS,
    [
      "Total",
      "",
      "",
      formatHours(totals.estimateHours),
      formatMoney(totals.estimateCost, totals.currency),
      formatHours(totals.actualHours),
      formatMoney(totals.actualSpend, totals.currency),
      formatHours(totals.remainingHours),
      formatMoney(totals.remainingSpend, totals.currency),
    ],
    ...ordered.flatMap((project) => [
      copyLine(project, { ...project.total, ticket: "Total" }, project.title),
      copyLine(project, project.pm, ""),
      copyLine(project, project.dev, project.subtitle ?? ""),
    ]),
  ];
  return `BURN RATE (${projects.length})\n${rows.map((row) => row.join("\t")).join("\n")}`;
}

function copyLine(
  project: BurnProject,
  line: BurnLine | (Omit<BurnLine, "ticket"> & { ticket: string }),
  label: string,
): string[] {
  return [
    label,
    line.ticket,
    line.ticket === "Total" ? line.status : "",
    formatHours(line.estimateHours),
    formatMoney(line.estimateCost, project.currency),
    formatHours(line.actualHours),
    formatMoney(line.actualSpend, project.currency),
    formatHours(line.remainingHours),
    formatMoney(line.remainingSpend, project.currency),
  ];
}

const INK = "#0f1c2e";
const MUTED = "#64748b";
const NAVY = "#1e3a5f";
const BORDER = "#94a3b8";
const WHITE = "#ffffff";
const FONT = "Arial, Helvetica, sans-serif";
const GROUP_BG = "#c7d3f5";
const ESTIMATE_BG = "#eef2f6";
const ACTUAL_BG = "#ecfdf5";
const REMAINING_BG = "#fffbeb";

export function formatBurnRateReportHtml(projects: BurnProject[], totals: BurnTotals): string {
  if (projects.length === 0) return "";
  const ordered = sortBurnProjects(projects);
  const head = `
    <tr>
      ${th("Project", WHITE)}
      ${th("Ticket", WHITE)}
      ${th("Status", WHITE)}
      ${metricTh("Estimate (Hr)", formatHours(totals.estimateHours), ESTIMATE_BG)}
      ${metricTh("Estimate (cost)", formatMoney(totals.estimateCost, totals.currency), ESTIMATE_BG)}
      ${metricTh("Actual", formatHours(totals.actualHours), ACTUAL_BG)}
      ${metricTh("Actual (Spend)", formatMoney(totals.actualSpend, totals.currency), ACTUAL_BG)}
      ${metricTh("Remaining (Hr)", formatHours(totals.remainingHours), REMAINING_BG)}
      ${metricTh("Remaining (Spend)", formatMoney(totals.remainingSpend, totals.currency), REMAINING_BG)}
    </tr>`;
  const body = ordered
    .flatMap((project) => [
      htmlLine(project, { ...project.total, ticket: "Total" }, true),
      htmlLine(project, project.pm, false),
      htmlLine(project, project.dev, false),
    ])
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:${FONT};color:${INK};font-size:14px;line-height:1.45;border-collapse:collapse;border:1px solid ${BORDER};">
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table>`;
}

function th(label: string, background: string): string {
  return `<th style="background:${background};border:1px solid ${BORDER};padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:${NAVY};text-transform:uppercase;">${escapeHtml(label)}</th>`;
}

function metricTh(label: string, total: string, background: string): string {
  return `<th style="background:${background};border:1px solid ${BORDER};padding:8px 12px;text-align:right;color:${NAVY};">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;">${escapeHtml(label)}</div>
    <div style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:4px;">${escapeHtml(total)}</div>
  </th>`;
}

function htmlLine(
  project: BurnProject,
  line: BurnLine | (Omit<BurnLine, "ticket"> & { ticket: string }),
  first: boolean,
): string {
  const weight = first ? "700" : "400";
  const rowBg = first ? GROUP_BG : WHITE;
  const projectCell = first
    ? `<td rowspan="3" style="border:1px solid ${BORDER};padding:8px 12px;vertical-align:top;background:${WHITE};">
        <div style="font-weight:700;">${escapeHtml(project.title)}</div>
        <div style="margin-top:2px;font-size:12px;color:${MUTED};">${escapeHtml(project.subtitle ?? project.clientName)}</div>
      </td>`
    : "";
  return `<tr>
    ${projectCell}
    <td style="border:1px solid ${BORDER};padding:8px 12px;background:${rowBg};font-weight:${weight};">${escapeHtml(line.ticket)}</td>
    <td style="border:1px solid ${BORDER};padding:8px 12px;background:${rowBg};font-weight:${weight};${first && line.status === "UAT" ? "color:#8B5A2B;" : ""}">${first ? escapeHtml(line.status) : ""}</td>
    ${metricTd(formatHours(line.estimateHours), first ? GROUP_BG : ESTIMATE_BG, first)}
    ${metricTd(formatMoney(line.estimateCost, project.currency), first ? GROUP_BG : ESTIMATE_BG, first)}
    ${metricTd(formatHours(line.actualHours), first ? GROUP_BG : ACTUAL_BG, first)}
    ${metricTd(formatMoney(line.actualSpend, project.currency), first ? GROUP_BG : ACTUAL_BG, first)}
    ${metricTd(formatHours(line.remainingHours), first ? GROUP_BG : REMAINING_BG, first)}
    ${metricTd(formatMoney(line.remainingSpend, project.currency), first ? GROUP_BG : REMAINING_BG, first)}
  </tr>`;
}

function metricTd(value: string, background: string, emphasis = false): string {
  return `<td style="border:1px solid ${BORDER};padding:8px 12px;text-align:right;font-variant-numeric:tabular-nums;background:${background};font-weight:${emphasis ? "700" : "400"};">${escapeHtml(value)}</td>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
