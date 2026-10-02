"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Clock3, Code2, Copy, Download, Gauge, Percent, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatBurnRateReportHtml, formatBurnRateReportText, formatGroupingSpend, formatMoney, sortBurnProjects, sumGroupingSpend, type BurnProject, type BurnStatus, type BurnTotals } from "@/lib/burn-rate";
import {
  currentYearMonth,
  detectMonthRangePreset,
  formatYearMonth,
  monthRangeForPreset,
  shiftYearMonth,
  toYearMonthInput,
  type MonthRangePreset,
} from "@/lib/months";
import { appendQueryValues } from "@/lib/query-params";
import { isCapitalTimeAndMaterials, isManagedService, isSow, isTimeTrackedProject, PROJECT_TYPE_LABELS, roundHours } from "@/lib/calculations";
import { formatInvoiceReportHtml, formatInvoiceReportText } from "@/lib/invoice-copy";
import {
  formatOverviewReportHtml,
  formatOverviewReportText,
  formatWeeklyStatusReportHtml,
  formatWeeklyStatusReportText,
} from "@/lib/overview-copy";
import { formatSowReportHtml, formatSowReportText, type SowReportRow } from "@/lib/sow-report";
import { partitionByProjectType } from "@/lib/time-hours";
import { cn, formatHours, formatHoursUnit, nextMonthHint } from "@/lib/utils";
import { BurnRateReport } from "@/components/burn-rate-report";
import { SowReport } from "@/components/sow-report";
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

type ReportType = "overview" | "invoice" | "weekly-status" | "burn-rate" | "sow";

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
  currency?: string | null;
  totalSpend?: number | null;
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
  burnRate?: {
    projects: BurnProject[];
    totals: BurnTotals;
  };
  sow?: {
    rows: SowReportRow[];
  };
};

const EMPTY_BURN_TOTALS: BurnTotals = {
  estimateHours: 0,
  estimateCost: 0,
  actualHours: 0,
  actualSpend: 0,
  remainingHours: 0,
  remainingSpend: 0,
  currency: null,
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
  const [burnStatusSavingId, setBurnStatusSavingId] = useState<string | null>(null);
  const isWeeklyStatus = reportType === "weekly-status";
  const isBurnRate = reportType === "burn-rate";
  const isSowReport = reportType === "sow";

  useEffect(() => {
    Promise.all([
      api<{ clients: ClientRecord[] }>("/api/clients?active=true"),
      api<{ projects: Array<ProjectRecord & { clientId: string }> }>("/api/projects?active=true"),
    ]).then(([clientResult, projectResult]) => {
      const activeClientIds = new Set(clientResult.clients.map((client) => client.id));
      setClients(clientResult.clients);
      setProjects(
        projectResult.projects.filter(
          (project) => activeClientIds.has(project.clientId) && isTimeTrackedProject(project.type),
        ),
      );
    }).catch((error: Error) => toast.error(error.message));
  }, []);

  const projectsForFilters = projects.filter((project) => {
    if (clientIds.length && !clientIds.includes(project.clientId)) return false;
    if (isBurnRate) return isCapitalTimeAndMaterials(project.type);
    if (isSowReport) return isSow(project.type);
    return true;
  });
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
  }, [projects, clientIds, isBurnRate, isSowReport]);
  const filteredProjects = projectsForFilters.filter((project) => {
    if (!managerFilter.length) return true;
    return managerFilter.includes(project.productionManager ?? "unassigned");
  });

  function parse(value: string) {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
  }

  function applyMonthRangePreset(preset: MonthRangePreset) {
    if (preset === "custom") return;
    const range = monthRangeForPreset(preset);
    setStart(range.start);
    setEnd(range.end);
  }

  function reportParams(overrides?: {
    start?: string;
    end?: string;
    clientIds?: string[];
    projectIds?: string[];
    managerFilter?: string[];
    reportType?: ReportType;
  }) {
    const type = overrides?.reportType ?? reportType;
    const startValue = overrides?.start ?? start;
    const endValue = type === "weekly-status" ? startValue : (overrides?.end ?? end);
    const from = parse(startValue);
    const to = parse(endValue);
    const selectedClients = overrides?.clientIds ?? clientIds;
    const selectedProjects = type === "weekly-status" ? [] : (overrides?.projectIds ?? projectIds);
    const selectedManagers = type === "weekly-status" ? [] : (overrides?.managerFilter ?? managerFilter);
    const params = new URLSearchParams({
      startYear: String(from.year),
      startMonth: String(from.month),
      endYear: String(to.year),
      endMonth: String(to.month),
      reportType: type,
    });
    appendQueryValues(params, "clientId", selectedClients);
    appendQueryValues(params, "projectId", selectedProjects);
    appendQueryValues(params, "productionManager", selectedManagers);
    return params;
  }

  async function run(overrides?: Parameters<typeof reportParams>[0]) {
    const type = overrides?.reportType ?? reportType;
    const selectedClients = overrides?.clientIds ?? clientIds;
    if (type === "weekly-status" && selectedClients.length === 0) {
      toast.error("Select at least one client.");
      return;
    }
    setLoading(true);
    try {
      const result = await api<ReportResponse>(`/api/reports?${reportParams(overrides).toString()}`);
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

  function handleReportTypeChange(next: ReportType) {
    setReportType(next);
    if (next === "weekly-status") {
      const month = end;
      setStart(month);
      setProjectIds([]);
      setManagerFilter([]);
      if (clientIds.length === 0) return;
      void run({
        reportType: next,
        start: month,
        end: month,
        clientIds,
        projectIds: [],
        managerFilter: [],
      });
      return;
    }
    const capitalProjectIds = projectIds.filter((id) => {
      const project = projects.find((item) => item.id === id);
      return project != null && isCapitalTimeAndMaterials(project.type);
    });
    const sowProjectIds = projectIds.filter((id) => {
      const project = projects.find((item) => item.id === id);
      return project != null && isSow(project.type);
    });
    const nextProjectIds = next === "burn-rate" ? capitalProjectIds : next === "sow" ? sowProjectIds : projectIds;
    if (next === "burn-rate" || next === "sow") {
      setProjectIds(nextProjectIds);
    }
    if (next === "burn-rate" || reportType === "burn-rate" || next === "sow" || reportType === "sow") {
      void run({ reportType: next, projectIds: nextProjectIds });
    }
  }

  async function saveBurnStatus(projectId: string, status: BurnStatus) {
    const previous = report?.burnRate?.projects.find((project) => project.projectId === projectId)?.total.status;
    setReport((current) => {
      if (!current?.burnRate) return current;
      return {
        ...current,
        burnRate: {
          ...current.burnRate,
          projects: sortBurnProjects(
            current.burnRate.projects.map((project) =>
              project.projectId === projectId ? { ...project, total: { ...project.total, status } } : project,
            ),
          ),
        },
      };
    });
    setBurnStatusSavingId(projectId);
    try {
      await api(`/api/projects/${projectId}/burn-status`, {
        method: "PATCH",
        body: JSON.stringify({ burnStatus: status }),
      });
    } catch (error) {
      if (previous) {
        setReport((current) => {
          if (!current?.burnRate) return current;
          return {
            ...current,
            burnRate: {
              ...current.burnRate,
              projects: sortBurnProjects(
                current.burnRate.projects.map((project) =>
                  project.projectId === projectId ? { ...project, total: { ...project.total, status: previous } } : project,
                ),
              ),
            },
          };
        });
      }
      toast.error(error instanceof Error ? error.message : "Unable to save status.");
    } finally {
      setBurnStatusSavingId(null);
    }
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
  const managedSummary = useMemo(() => {
    const available = roundHours(groupedRows.managed.reduce((sum, row) => sum + (row.hoursAvailable ?? 0), 0));
    const used = roundHours(groupedRows.managed.reduce((sum, row) => sum + row.hoursUsed, 0));
    const remaining = roundHours(groupedRows.managed.reduce((sum, row) => sum + (row.hoursRemaining ?? 0), 0));
    const nextMonth = roundHours(groupedRows.managed.reduce((sum, row) => sum + (row.hoursForNextMonth ?? 0), 0));
    return {
      available,
      used,
      remaining,
      nextMonth,
      utilization: available > 0 ? (used / available) * 100 : 0,
    };
  }, [groupedRows]);
  const tmSummary = useMemo(() => ({
    development: roundHours(groupedRows.timeAndMaterials.reduce((sum, row) => sum + (row.developmentHours ?? 0), 0)),
    pm: roundHours(groupedRows.timeAndMaterials.reduce((sum, row) => sum + (row.pmHours ?? 0), 0)),
    total: roundHours(groupedRows.timeAndMaterials.reduce((sum, row) => sum + row.hoursUsed, 0)),
    ...sumGroupingSpend(groupedRows.timeAndMaterials),
  }), [groupedRows]);
  const capitalSummary = useMemo(() => ({
    development: roundHours(groupedRows.capitalTimeAndMaterials.reduce((sum, row) => sum + (row.developmentHours ?? 0), 0)),
    pm: roundHours(groupedRows.capitalTimeAndMaterials.reduce((sum, row) => sum + (row.pmHours ?? 0), 0)),
    total: roundHours(groupedRows.capitalTimeAndMaterials.reduce((sum, row) => sum + row.hoursUsed, 0)),
    ...sumGroupingSpend(groupedRows.capitalTimeAndMaterials),
  }), [groupedRows]);
  const weeklyMonth = parse(start);
  const weeklyClientNames = clients
    .filter((client) => clientIds.includes(client.id))
    .map((client) => client.name);
  const weeklyHeading = weeklyClientNames.length
    ? `${weeklyClientNames.join(", ")} — ${formatYearMonth(weeklyMonth.year, weeklyMonth.month)}`
    : null;
  const weeklyShowClient = new Set([
    ...groupedRows.managed.map((row) => row.clientName),
    ...groupedRows.timeAndMaterials.map((row) => row.clientName),
    ...groupedRows.capitalTimeAndMaterials.map((row) => row.clientName),
  ]).size > 1;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Analyze client and project utilization across a date range."
        actions={
          <>
            <Button
              variant="outline"
              disabled={
                loading
                || (isBurnRate
                  ? !report?.burnRate?.projects.length
                  : isSowReport
                    ? !report?.sow?.rows.length
                    : !report?.rows.length)
              }
              onClick={() => {
                if (reportType === "sow") {
                  void copySowReport(report?.sow?.rows ?? []);
                  return;
                }
                if (reportType === "burn-rate") {
                  void copyBurnRateReport(report?.burnRate?.projects ?? [], report?.burnRate?.totals ?? EMPTY_BURN_TOTALS);
                  return;
                }
                if (reportType === "invoice") {
                  void copyInvoiceReport(groupedRows.managed, groupedRows.timeAndMaterials, groupedRows.capitalTimeAndMaterials);
                  return;
                }
                if (reportType === "weekly-status") {
                  if (!report || !weeklyHeading) {
                    toast.error("Nothing to copy.");
                    return;
                  }
                  void copyWeeklyStatusReport(
                    weeklyHeading,
                    report.summary,
                    groupedRows.managed,
                    groupedRows.timeAndMaterials,
                    groupedRows.capitalTimeAndMaterials,
                    weeklyShowClient,
                  );
                  return;
                }
                void copyOverviewReport(groupedRows.managed, groupedRows.timeAndMaterials, groupedRows.capitalTimeAndMaterials);
              }}
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-type">Report type</Label>
            <FilterSelect
              id="report-type"
              className="w-full"
              aria-label="Report type"
              value={reportType}
              onChange={(event) => handleReportTypeChange(event.target.value as ReportType)}
            >
              <option value="overview">Overview</option>
              <option value="invoice">Invoice</option>
              <option value="weekly-status">Weekly Status</option>
              <option value="burn-rate">Burn Rate</option>
              <option value="sow">SOW</option>
            </FilterSelect>
          </div>
          {isWeeklyStatus ? (
            <>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <FilterMultiSelect
                  className="w-full"
                  ariaLabel="Filter by client"
                  placeholder="Select clients"
                  countNoun="clients"
                  value={clientIds}
                  onChange={setClientIds}
                  options={clients.map((client) => ({ value: client.id, label: client.name }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly-month">Month</Label>
                <input
                  id="weekly-month"
                  type="month"
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  value={start}
                  onChange={(event) => {
                    setStart(event.target.value);
                    setEnd(event.target.value);
                  }}
                />
              </div>
            </>
          ) : (
            <>
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
            <Label htmlFor="report-range">Range</Label>
            <FilterSelect
              id="report-range"
              className="w-full"
              aria-label="Date range"
              value={detectMonthRangePreset(start, end)}
              onChange={(event) => applyMonthRangePreset(event.target.value as MonthRangePreset)}
            >
              <option value="custom">Custom range</option>
              <option value="current">Current month</option>
              <option value="previous">Previous month</option>
            </FilterSelect>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <input type="month" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <input type="month" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
            </>
          )}
          <div className="flex items-end">
            <Button onClick={() => void run()}>Run report</Button>
          </div>
        </div>
      </Card>
      {isWeeklyStatus && weeklyHeading ? (
        <h2 className="mb-4 text-[var(--text-section)] font-semibold tracking-tight text-[var(--foreground)]">
          {weeklyHeading}
        </h2>
      ) : null}
      {report && reportType !== "overview" && reportType !== "burn-rate" && reportType !== "sow" ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Available" value={formatHoursUnit(report.summary.totalAvailableHours)} icon={Wallet} />
          <SummaryCard title="Total Used" value={formatHoursUnit(report.summary.totalUsedHours)} icon={Clock3} />
          <SummaryCard
            title="Total Remaining"
            value={formatHoursUnit(report.summary.totalRemainingHours)}
            icon={Gauge}
            tone={report.summary.totalRemainingHours < 0 ? "danger" : "success"}
          />
          <SummaryCard title="Utilization" value={`${formatHours(report.summary.utilizationPercent)}%`} icon={Percent} tone={report.summary.utilizationPercent > 100 ? "danger" : "default"} />
        </div>
      ) : null}
      {report && reportType === "sow" ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard title="Quoted Hours" value={formatHoursUnit(report.summary.totalAvailableHours)} icon={Wallet} />
          <SummaryCard title="Hours Used" value={formatHoursUnit(report.summary.totalUsedHours)} icon={Clock3} />
          <SummaryCard
            title="Remaining"
            value={formatHoursUnit(report.summary.totalRemainingHours)}
            icon={Gauge}
            tone={report.summary.totalRemainingHours < 0 ? "danger" : "success"}
          />
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
      ) : isBurnRate ? (
        <BurnRateReport
          projects={report?.burnRate?.projects ?? []}
          totals={report?.burnRate?.totals ?? EMPTY_BURN_TOTALS}
          statusSavingId={burnStatusSavingId}
          onStatusChange={(projectId, status) => void saveBurnStatus(projectId, status)}
        />
      ) : isSowReport ? (
        <SowReport rows={report?.sow?.rows ?? []} />
      ) : !report?.rows.length ? (
        <Card className="overflow-hidden">
          <EmptyState title="No report rows" description="Adjust filters or add time entries first." />
        </Card>
      ) : reportType === "invoice" ? (
        <InvoiceReportCards
          managed={groupedRows.managed}
          timeAndMaterials={groupedRows.timeAndMaterials}
          capitalTimeAndMaterials={groupedRows.capitalTimeAndMaterials}
        />
      ) : (
        <div className="space-y-5">
          {groupedRows.managed.length > 0 ? (
            <Card className="overflow-hidden">
              <ProjectTypeHeading title="Managed Service" count={groupedRows.managed.length} />
              {reportType === "overview" ? (
                <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard title="Total Available" value={formatHoursUnit(managedSummary.available)} icon={Wallet} />
                  <SummaryCard title="Total Used" value={formatHoursUnit(managedSummary.used)} icon={Clock3} />
                  <SummaryCard
                    title="Total Remaining"
                    value={formatHoursUnit(managedSummary.remaining)}
                    icon={Gauge}
                    tone={managedSummary.remaining < 0 ? "danger" : "success"}
                  />
                  <SummaryCard
                    title="Utilization"
                    value={`${formatHours(managedSummary.utilization)}%`}
                    icon={Percent}
                    tone={managedSummary.utilization > 100 ? "danger" : "default"}
                  />
                </div>
              ) : null}
              <Table className={isWeeklyStatus ? "table-fixed" : undefined}>
                {isWeeklyStatus ? <WeeklySplitColgroup showClient={weeklyShowClient} /> : null}
                <TableHeader>
                  <TableRow>
                    {isWeeklyStatus ? (
                      weeklyShowClient ? <TableHead>Client</TableHead> : null
                    ) : (
                      <>
                        <TableHead>Month</TableHead>
                        <TableHead>Client</TableHead>
                      </>
                    )}
                    <TableHead>Project</TableHead>
                    {isWeeklyStatus ? null : <TableHead>Project Manager</TableHead>}
                    <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.development))}>Available</TableHead>
                    <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.pm))}>Used</TableHead>
                    <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.total))}>Remaining</TableHead>
                    <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.spend))}>Next Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.managed.map((row, index) => (
                    <TableRow key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`}>
                      {isWeeklyStatus ? (
                        weeklyShowClient ? <TableCell className="min-w-0">{row.clientName}</TableCell> : null
                      ) : (
                        <>
                          <TableCell>{formatYearMonth(row.year, row.month)}</TableCell>
                          <TableCell>{row.clientName}</TableCell>
                        </>
                      )}
                      <TableCell className={isWeeklyStatus ? "min-w-0" : undefined}>{row.projectName}</TableCell>
                      {isWeeklyStatus ? null : <TableCell>{row.productionManager ?? "—"}</TableCell>}
                      <TableCell className={cn("text-right tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.development)}>{formatHours(row.hoursAvailable)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.pm)}>{formatHours(row.hoursUsed)}</TableCell>
                      <TableCell className={cn("text-right", isWeeklyStatus && WEEKLY_SPLIT_COLS.total)}>
                        <HoursRemaining value={row.hoursRemaining} />
                      </TableCell>
                      <TableCell className={cn("text-right", isWeeklyStatus && WEEKLY_SPLIT_COLS.spend)}>
                        <div className="font-medium tabular-nums">{formatHours(row.hoursForNextMonth)}</div>
                        {nextMonthHint(row) ? (
                          <div className="text-[calc(11px+1pt)] text-[var(--primary)]">{nextMonthHint(row)}</div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {isWeeklyStatus ? (
                    <TableRow className={cn(groupHeaderBgClass, "font-semibold hover:bg-[color-mix(in_srgb,var(--primary)_25%,white)]")}>
                      <TableCell colSpan={weeklyShowClient ? 2 : 1}>Total</TableCell>
                      <TableCell className={cn("text-right tabular-nums", WEEKLY_SPLIT_COLS.development)}>{formatHours(managedSummary.available)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", WEEKLY_SPLIT_COLS.pm)}>{formatHours(managedSummary.used)}</TableCell>
                      <TableCell className={cn("text-right", WEEKLY_SPLIT_COLS.total)}>
                        <HoursRemaining value={managedSummary.remaining} />
                      </TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", WEEKLY_SPLIT_COLS.spend)}>
                        {formatHours(managedSummary.nextMonth)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Card>
          ) : null}
          {groupedRows.timeAndMaterials.length > 0 ? (
            <ReportSplitHoursCard
              title="Time & Materials"
              rows={groupedRows.timeAndMaterials}
              summary={tmSummary}
              reportType={reportType}
              isWeeklyStatus={isWeeklyStatus}
              showClient={weeklyShowClient}
              showTotalSpend={isWeeklyStatus}
            />
          ) : null}
          {groupedRows.capitalTimeAndMaterials.length > 0 ? (
            <ReportSplitHoursCard
              title={PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS}
              rows={groupedRows.capitalTimeAndMaterials}
              summary={capitalSummary}
              reportType={reportType}
              isWeeklyStatus={isWeeklyStatus}
              showClient={weeklyShowClient}
              showTotalSpend={isWeeklyStatus}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

const WEEKLY_SPLIT_COLS = {
  development: "w-[10.5rem]",
  pm: "w-[8rem]",
  total: "w-[6.5rem]",
  spend: "w-[12rem]",
} as const;

function WeeklySplitColgroup({ showClient = false }: { showClient?: boolean }) {
  return (
    <colgroup>
      {showClient ? <col className="w-[9rem]" style={{ width: "9rem" }} /> : null}
      <col />
      <col className={WEEKLY_SPLIT_COLS.development} style={{ width: "10.5rem" }} />
      <col className={WEEKLY_SPLIT_COLS.pm} style={{ width: "8rem" }} />
      <col className={WEEKLY_SPLIT_COLS.total} style={{ width: "6.5rem" }} />
      <col className={WEEKLY_SPLIT_COLS.spend} style={{ width: "12rem" }} />
    </colgroup>
  );
}

function ReportSplitHoursCard({
  title,
  rows,
  summary,
  reportType,
  isWeeklyStatus,
  showClient = false,
  showTotalSpend = false,
}: {
  title: string;
  rows: ReportRow[];
  summary: { development: number; pm: number; total: number; spend?: number | null; currency?: string | null };
  reportType: ReportType;
  isWeeklyStatus: boolean;
  showClient?: boolean;
  showTotalSpend?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <ProjectTypeHeading title={title} count={rows.length} />
      {reportType === "overview" ? (
        <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-3">
          <SummaryCard title="Dev Hours Used" value={formatHoursUnit(summary.development)} icon={Code2} />
          <SummaryCard title="PM Hours Used" value={formatHoursUnit(summary.pm)} icon={User} />
          <SummaryCard title="Total Hours Used" value={formatHoursUnit(summary.total)} icon={Clock3} />
        </div>
      ) : null}
      <Table className={isWeeklyStatus ? "table-fixed" : undefined}>
        {isWeeklyStatus ? <WeeklySplitColgroup showClient={showClient} /> : null}
        <TableHeader>
          <TableRow>
            {isWeeklyStatus ? (
              showClient ? <TableHead>Client</TableHead> : null
            ) : (
              <>
                <TableHead>Month</TableHead>
                <TableHead>Client</TableHead>
              </>
            )}
            <TableHead>Project</TableHead>
            {isWeeklyStatus ? null : <TableHead>Project Manager</TableHead>}
            <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.development))}>Development Hours</TableHead>
            <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.pm))}>PM Hours</TableHead>
            <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.total))}>Total</TableHead>
            {showTotalSpend ? (
              <TableHead className={cn("text-right", isWeeklyStatus && cn("whitespace-nowrap", WEEKLY_SPLIT_COLS.spend))}>Total Spend</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.clientName}-${row.projectName}-${row.year}-${row.month}-${index}`}>
              {isWeeklyStatus ? (
                showClient ? <TableCell className="min-w-0">{row.clientName}</TableCell> : null
              ) : (
                <>
                  <TableCell>{formatYearMonth(row.year, row.month)}</TableCell>
                  <TableCell>{row.clientName}</TableCell>
                </>
              )}
              <TableCell className={isWeeklyStatus ? "min-w-0" : undefined}>{row.projectName}</TableCell>
              {isWeeklyStatus ? null : <TableCell>{row.productionManager ?? "—"}</TableCell>}
              <TableCell className={cn("text-right tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.development)}>
                {formatHours(row.developmentHours)}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.pm)}>
                {formatHours(row.pmHours)}
              </TableCell>
              <TableCell className={cn("text-right font-medium tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.total)}>
                {formatHours(row.hoursUsed)}
              </TableCell>
              {showTotalSpend ? (
                <TableCell className={cn("text-right font-medium tabular-nums", isWeeklyStatus && WEEKLY_SPLIT_COLS.spend)}>
                  {formatMoney(row.totalSpend, row.currency)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          {isWeeklyStatus ? (
            <TableRow className={cn(groupHeaderBgClass, "font-semibold hover:bg-[color-mix(in_srgb,var(--primary)_25%,white)]")}>
              <TableCell colSpan={showClient ? 2 : 1}>Total</TableCell>
              <TableCell className={cn("text-right tabular-nums", WEEKLY_SPLIT_COLS.development)}>
                {formatHours(summary.development)}
              </TableCell>
              <TableCell className={cn("text-right tabular-nums", WEEKLY_SPLIT_COLS.pm)}>
                {formatHours(summary.pm)}
              </TableCell>
              <TableCell className={cn("text-right font-medium tabular-nums", WEEKLY_SPLIT_COLS.total)}>
                {formatHours(summary.total)}
              </TableCell>
              {showTotalSpend ? (
                <TableCell className={cn("text-right font-medium tabular-nums whitespace-nowrap", WEEKLY_SPLIT_COLS.spend)}>
                  {formatGroupingSpend(rows)}
                </TableCell>
              ) : null}
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  );
}

function InvoiceReportCards({
  managed,
  timeAndMaterials,
  capitalTimeAndMaterials,
}: {
  managed: ReportRow[];
  timeAndMaterials: ReportRow[];
  capitalTimeAndMaterials: ReportRow[];
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
      {capitalTimeAndMaterials.length > 0 ? (
        <section>
          <Card className="mb-3 overflow-hidden">
            <ProjectTypeHeading title={PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS} count={capitalTimeAndMaterials.length} />
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {capitalTimeAndMaterials.map((row, index) => (
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
              {hint ? <p className="text-[calc(11px+1pt)] text-[var(--primary)]">{hint}</p> : null}
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
      <p className="text-[calc(11px+1pt)] font-medium uppercase tracking-[0.04em] text-[var(--muted-foreground)]">{label}</p>
      <div>{children}</div>
    </div>
  );
}

async function copySowReport(rows: SowReportRow[]) {
  const text = formatSowReportText(rows);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatSowReportHtml(rows);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Report copied.");
  } catch {
    toast.error("Unable to copy report.");
  }
}

async function copyBurnRateReport(projects: BurnProject[], totals: BurnTotals) {
  const text = formatBurnRateReportText(projects, totals);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatBurnRateReportHtml(projects, totals);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Report copied.");
  } catch {
    toast.error("Unable to copy report.");
  }
}

async function copyWeeklyStatusReport(
  heading: string,
  summary: ReportResponse["summary"],
  managed: ReportRow[],
  timeAndMaterials: ReportRow[],
  capitalTimeAndMaterials: ReportRow[],
  includeClient = false,
) {
  const text = formatWeeklyStatusReportText(heading, summary, managed, timeAndMaterials, capitalTimeAndMaterials, includeClient);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatWeeklyStatusReportHtml(heading, summary, managed, timeAndMaterials, capitalTimeAndMaterials, includeClient);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Report copied.");
  } catch {
    toast.error("Unable to copy report.");
  }
}

async function copyOverviewReport(
  managed: ReportRow[],
  timeAndMaterials: ReportRow[],
  capitalTimeAndMaterials: ReportRow[],
) {
  const text = formatOverviewReportText(managed, timeAndMaterials, capitalTimeAndMaterials);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatOverviewReportHtml(managed, timeAndMaterials, capitalTimeAndMaterials);
  try {
    await copyTextAndHtml(text, html);
    toast.success("Report copied.");
  } catch {
    toast.error("Unable to copy report.");
  }
}

async function copyInvoiceReport(
  managed: ReportRow[],
  timeAndMaterials: ReportRow[],
  capitalTimeAndMaterials: ReportRow[],
) {
  const text = formatInvoiceReportText(managed, timeAndMaterials, capitalTimeAndMaterials);
  if (!text) {
    toast.error("Nothing to copy.");
    return;
  }
  const html = formatInvoiceReportHtml(managed, timeAndMaterials, capitalTimeAndMaterials);
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
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:auto;opacity:0;pointer-events:none;";
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
