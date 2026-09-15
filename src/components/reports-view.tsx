"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Clock3, Copy, Download, Gauge, Percent, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { currentYearMonth, formatYearMonth, shiftYearMonth, toYearMonthInput } from "@/lib/months";
import { appendQueryValues } from "@/lib/query-params";
import { isManagedService } from "@/lib/calculations";
import { formatInvoiceReportHtml, formatInvoiceReportText } from "@/lib/invoice-copy";
import { formatOverviewReportHtml, formatOverviewReportText } from "@/lib/overview-copy";
import { partitionByProjectType } from "@/lib/time-hours";
import { cn, formatHours, formatHoursUnit, nextMonthHint } from "@/lib/utils";
import type { ClientRecord } from "@/components/clients-view";
import type { ProjectRecord } from "@/components/project-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { FilterSelect } from "@/components/ui/filter-select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { HoursRemaining } from "@/components/ui/hours-remaining";
import { groupHeaderBgClass, ProjectTypeHeading } from "@/components/ui/project-type-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ReportType = "overview" | "invoice";

type ReportRow = {
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

type ReportResponse = {
  rows: ReportRow[];
  summary: {
    totalAvailableHours: number;
    totalUsedHours: number;
    totalRemainingHours: number;
    averageMonthlyUsage: number;
    utilizationPercent: number;
  };
};

export function ReportsView() {
  const current = currentYearMonth();
  const startDefault = shiftYearMonth(current.year, current.month, -5);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [projects, setProjects] = useState<Array<ProjectRecord & { clientId: string }>>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string[]>([]);
  const [reportType, setReportType] = useState<ReportType>("overview");
  const [start, setStart] = useState(toYearMonthInput(startDefault.year, startDefault.month));
  const [end, setEnd] = useState(toYearMonthInput(current.year, current.month));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ clients: ClientRecord[] }>("/api/clients?active=true"),
      api<{ projects: Array<ProjectRecord & { clientId: string }> }>("/api/projects?active=true"),
    ]).then(([clientResult, projectResult]) => {
      const activeClientIds = new Set(clientResult.clients.map((client) => client.id));
      setClients(clientResult.clients);
      setProjects(projectResult.projects.filter((project) => activeClientIds.has(project.clientId)));
    }).catch((error: Error) => toast.error(error.message));
  }, []);

  const projectsForFilters = projects.filter((project) => !clientIds.length || clientIds.includes(project.clientId));
  const managerOptions = useMemo(() => {
    const names = [...new Set(
      projectsForFilters
        .map((project) => project.productionManager)
        .filter((name): name is string => Boolean(name)),
    )].sort((a, b) => a.localeCompare(b));
    const hasUnassigned = projectsForFilters.some((project) => !project.productionManager);
    return [
      ...(hasUnassigned ? [{ value: "unassigned", label: "Unassigned" }] : []),
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [projects, clientIds]);
  const filteredProjects = projectsForFilters.filter((project) => {
    if (!managerFilter.length) return true;
    return managerFilter.includes(project.productionManager ?? "unassigned");
  });

  function parse(value: string) {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
  }

  function reportParams() {
    const from = parse(start);
    const to = parse(end);
    const params = new URLSearchParams({
      startYear: String(from.year),
      startMonth: String(from.month),
      endYear: String(to.year),
      endMonth: String(to.month),
    });
    appendQueryValues(params, "clientId", clientIds);
    appendQueryValues(params, "projectId", projectIds);
    appendQueryValues(params, "productionManager", managerFilter);
    return params;
  }

  async function run() {
    setLoading(true);
    try {
      const result = await api<ReportResponse>(`/api/reports?${reportParams().toString()}`);
      setReport(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to build report.");
    } finally {
      setLoading(false);
    }
  }

  function exportUrl(format: "csv" | "xlsx") {
    const params = reportParams();
    params.set("format", format);
    return `/api/reports/export?${params.toString()}`;
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoursByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of report?.rows ?? []) {
      map.set(row.clientName, (map.get(row.clientName) ?? 0) + row.hoursUsed);
    }
    return [...map.entries()]
      .map(([name, used]) => ({ name, used }))
      .sort((a, b) => b.used - a.used || a.name.localeCompare(b.name));
  }, [report]);

  const groupedRows = useMemo(
    () => partitionByProjectType(report?.rows ?? []),
    [report],
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analyze client and project utilization across a date range."
        actions={
          <>
            <Button
              variant="outline"
              disabled={loading || !report?.rows.length}
              onClick={() =>
                reportType === "invoice"
                  ? void copyInvoiceReport(groupedRows.managed, groupedRows.timeAndMaterials)
                  : void copyOverviewReport(groupedRows.managed, groupedRows.timeAndMaterials)
              }
            >
              <Copy />
              Copy
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("csv")}>
                <Download />
                Export CSV
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={exportUrl("xlsx")}>
                <Download />
                Excel
              </a>
            </Button>
          </>
        }
      />
      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-type">Report type</Label>
            <FilterSelect
              id="report-type"
              className="w-full"
              aria-label="Report type"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              <option value="overview">Overview</option>
              <option value="invoice">Invoice</option>
            </FilterSelect>
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <FilterMultiSelect
              className="w-full"
              ariaLabel="Filter by client"
              placeholder="All clients"
              countNoun="clients"
              value={clientIds}
              onChange={(next) => {
                setClientIds(next);
                const remainingProjects = projects.filter((project) => next.length === 0 || next.includes(project.clientId));
                setManagerFilter((current) =>
                  current.filter((manager) => {
                    if (manager === "unassigned") return remainingProjects.some((project) => !project.productionManager);
                    return remainingProjects.some((project) => project.productionManager === manager);
                  }),
                );
                setProjectIds((current) =>
                  current.filter((id) => remainingProjects.some((project) => project.id === id)),
                );
              }}
              options={clients.map((client) => ({ value: client.id, label: client.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project</Label>
            <FilterMultiSelect
              className="w-full"
              ariaLabel="Filter by project"
              placeholder="All projects"
              countNoun="projects"
              value={projectIds}
              onChange={setProjectIds}
              options={filteredProjects.map((project) => ({ value: project.id, label: project.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Project Manager</Label>
            <FilterMultiSelect
              className="w-full"
              ariaLabel="Filter by project manager"
              placeholder="All project managers"
              countNoun="project managers"
              value={managerFilter}
              onChange={(next) => {
                setManagerFilter(next);
                setProjectIds((current) =>
                  current.filter((id) => {
                    const project = projects.find((item) => item.id === id);
                    if (!project) return false;
                    if (next.length === 0) return true;
                    return next.includes(project.productionManager ?? "unassigned");
                  }),
                );
              }}
              options={managerOptions}
            />
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <input type="month" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <input type="month" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={run}>Run report</Button>
          </div>
        </div>
      </Card>
      {report ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Available" value={formatHoursUnit(report.summary.totalAvailableHours)} icon={Wallet} />
          <SummaryCard title="Total Used" value={formatHoursUnit(report.summary.totalUsedHours)} icon={Clock3} />
          <SummaryCard
            title="Total Remaining"
            value={formatHoursUnit(report.summary.totalRemainingHours)}
            icon={Gauge}
            tone={report.summary.totalRemainingHours < 0 ? "danger" : "success"}
          />
          <SummaryCard title="Utilization" value={`${formatHours(report.summary.utilizationPercent)}%`} icon={Percent} />
        </div>
      ) : null}
      {reportType === "overview" ? (
        <Card className="mb-5 p-5">
          <h2 className="mb-4 text-[var(--text-section)] font-semibold">Hours used by client</h2>
          {loading ? (
            <TableSkeleton rows={5} cols={2} />
          ) : hoursByClient.length === 0 ? (
            <EmptyState title="No client hours" description="Add time entries to compare clients." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {hoursByClient.map((item) => (
                <Card key={item.name} className="p-4 shadow-[var(--shadow-sm)]">
                  <p className="text-sm text-[var(--foreground)]">
                    <span className="font-semibold">{item.name}</span>
                    {": "}
                    <span className="tabular-nums">{formatHours(item.used)} hours</span>
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : null}
      {loading ? (
        <Card className="overflow-hidden">
          <TableSkeleton />
        </Card>
      ) : !report?.rows.length ? (
        <Card className="overflow-hidden">
          <EmptyState title="No report rows" description="Adjust filters or add time entries first." />
        </Card>
      ) : reportType === "invoice" ? (
        <InvoiceReportCards managed={groupedRows.managed} timeAndMaterials={groupedRows.timeAndMaterials} />
      ) : (
        <div className="space-y-5">
          {groupedRows.managed.length > 0 ? (
            <Card className="overflow-hidden">
              <ProjectTypeHeading title="Managed Service" count={groupedRows.managed.length} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Project Manager</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Next Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.managed.map((row, index) => (
                    <TableRow key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`}>
                      <TableCell>{formatYearMonth(row.year, row.month)}</TableCell>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell>{row.projectName}</TableCell>
                      <TableCell>{row.productionManager ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(row.hoursAvailable)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(row.hoursUsed)}</TableCell>
                      <TableCell className="text-right">
                        <HoursRemaining value={row.hoursRemaining} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium tabular-nums">{formatHours(row.hoursForNextMonth)}</div>
                        {nextMonthHint(row) ? (
                          <div className="text-[11px] text-[var(--primary)]">{nextMonthHint(row)}</div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : null}
          {groupedRows.timeAndMaterials.length > 0 ? (
            <Card className="overflow-hidden">
              <ProjectTypeHeading title="Time & Materials" count={groupedRows.timeAndMaterials.length} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Project Manager</TableHead>
                    <TableHead className="text-right">Development Hours</TableHead>
                    <TableHead className="text-right">PM Hours</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.timeAndMaterials.map((row, index) => (
                    <TableRow key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`}>
                      <TableCell>{formatYearMonth(row.year, row.month)}</TableCell>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell>{row.projectName}</TableCell>
                      <TableCell>{row.productionManager ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(row.developmentHours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatHours(row.pmHours)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatHours(row.hoursUsed)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

function InvoiceReportCards({
  managed,
  timeAndMaterials,
}: {
  managed: ReportRow[];
  timeAndMaterials: ReportRow[];
}) {
  return (
    <div className="space-y-6">
      {managed.length > 0 ? (
        <section>
          <Card className="mb-3 overflow-hidden">
            <ProjectTypeHeading title="Managed Service" count={managed.length} />
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {managed.map((row, index) => (
              <InvoiceProjectCard key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`} row={row} />
            ))}
          </div>
        </section>
      ) : null}
      {timeAndMaterials.length > 0 ? (
        <section>
          <Card className="mb-3 overflow-hidden">
            <ProjectTypeHeading title="Time & Materials" count={timeAndMaterials.length} />
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {timeAndMaterials.map((row, index) => (
              <InvoiceProjectCard key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`} row={row} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function InvoiceProjectCard({ row }: { row: ReportRow }) {
  const hint = nextMonthHint(row);
  const managed = isManagedService(row.projectType);
  return (
    <Card className="overflow-hidden">
      <CardHeader className={cn("border-b border-[var(--border)]", groupHeaderBgClass)}>
        <InvoiceHeaderLine label="Client" value={row.clientName} />
        <InvoiceHeaderLine label="Month" value={formatYearMonth(row.year, row.month)} />
        <InvoiceHeaderLine label="Project" value={row.projectName} />
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {managed ? (
          <>
            <InvoiceMetric label="Available">
              <p className="tabular-nums">{formatHours(row.hoursAvailable)}</p>
            </InvoiceMetric>
            <InvoiceMetric label="Used">
              <p className="tabular-nums">{formatHours(row.hoursUsed)}</p>
            </InvoiceMetric>
            <InvoiceMetric label="Remaining">
              <HoursRemaining value={row.hoursRemaining} />
            </InvoiceMetric>
            <InvoiceMetric label="Next Month">
              <p className="font-medium tabular-nums">{formatHours(row.hoursForNextMonth)}</p>
              {hint ? <p className="text-[11px] text-[var(--primary)]">{hint}</p> : null}
            </InvoiceMetric>
          </>
        ) : (
          <>
            <InvoiceMetric label="Development Hours">
              <p className="tabular-nums">{formatHours(row.developmentHours)}</p>
            </InvoiceMetric>
            <InvoiceMetric label="PM Hours">
              <p className="tabular-nums">{formatHours(row.pmHours)}</p>
            </InvoiceMetric>
            <InvoiceMetric label="Total">
              <p className="font-medium tabular-nums">{formatHours(row.hoursUsed)}</p>
            </InvoiceMetric>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InvoiceHeaderLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-[var(--foreground)]">
      <span className="font-medium text-[var(--muted-foreground)]">{label}: </span>
      <span className="font-semibold">{value}</span>
    </p>
  );
}

function InvoiceMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--muted-foreground)]">{label}</p>
      <div>{children}</div>
    </div>
  );
}

async function copyOverviewReport(managed: ReportRow[], timeAndMaterials: ReportRow[]) {
  const text = formatOverviewReportText(managed, timeAndMaterials);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatOverviewReportHtml(managed, timeAndMaterials);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Report copied.");
  } catch {
    toast.error("Unable to copy report.");
  }
}

async function copyInvoiceReport(managed: ReportRow[], timeAndMaterials: ReportRow[]) {
  const text = formatInvoiceReportText(managed, timeAndMaterials);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatInvoiceReportHtml(managed, timeAndMaterials);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Invoice details copied.");
  } catch {
    toast.error("Unable to copy invoice details.");
  }
}

async function copyTextAndHtml(text: string, html: string) {
  if (copyHtmlViaSelection(html)) {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      void navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([htmlDocument(html)], { type: "text/html" }),
        }),
      ]).catch(() => undefined);
    }
    return;
  }

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([htmlDocument(html)], { type: "text/html" }),
        }),
      ]);
      return;
    }
  } catch {
    // Fall through to plain text.
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  copyPlainTextFallback(text);
}

function htmlDocument(body: string): string {
  return `<!DOCTYPE html><html><body>${body}</body></html>`;
}

function copyHtmlViaSelection(html: string): boolean {
  const host = document.createElement("div");
  host.setAttribute("contenteditable", "true");
  host.innerHTML = html;
  host.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(host);
  host.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(host);
  selection?.removeAllRanges();
  selection?.addRange(range);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } finally {
    selection?.removeAllRanges();
    host.remove();
  }
  return copied;
}

function copyPlainTextFallback(text: string) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) {
    throw new Error("copy failed");
  }
}
