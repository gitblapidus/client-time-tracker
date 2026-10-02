"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Briefcase,
  Clock3,
  Gauge,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, formatHours, formatHoursUnit } from "@/lib/utils";
import { currentYearMonth, formatYearMonth } from "@/lib/months";
import { partitionByProjectType } from "@/lib/time-hours";
import { PROJECT_TYPE_LABELS, type UtilizationStatus } from "@/lib/calculations";
import { HoursRemaining } from "@/components/ui/hours-remaining";
import { MonthSelector } from "@/components/ui/month-selector";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryCard } from "@/components/ui/summary-card";
import { Card } from "@/components/ui/card";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectTypeHeading } from "@/components/ui/project-type-heading";
import { UtilizationBar, utilizationPercent } from "@/components/ui/utilization-bar";

type DashboardRow = {
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  productionManager: string | null;
  projectType: string;
  monthlyHours: number | null;
  quotedHours: number | null;
  hoursUsed: number;
  developmentHours: number | null;
  pmHours: number | null;
  deliveryLeadHours: number | null;
  technicalLeadershipHours: number | null;
  hoursAvailable: number | null;
  hoursRemaining: number | null;
  hoursForNextMonth: number | null;
  status: UtilizationStatus;
};

type DashboardResponse = {
  cards: {
    totalClients: number;
    totalProjects: number;
    hoursUsed: number;
    previousHoursUsed: number;
    hoursRemaining: number;
    projectsOverAllocation: number;
    utilizationPercent: number;
  };
  rows: DashboardRow[];
};

type SortKey = "clientName" | "projectName" | "hoursUsed" | "hoursRemaining" | "utilization";

function DashboardSplitHoursTable({
  rows,
  SortLabel,
  onOpenClient,
}: {
  rows: DashboardRow[];
  SortLabel: (props: { label: string; column: SortKey }) => ReactNode;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortLabel label="Client" column="clientName" /></TableHead>
              <TableHead><SortLabel label="Project" column="projectName" /></TableHead>
              <TableHead className="text-right">Development Hours</TableHead>
              <TableHead className="text-right">PM Hours</TableHead>
              <TableHead className="text-right"><SortLabel label="Total" column="hoursUsed" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.projectId}
                className="cursor-pointer"
                onClick={() => onOpenClient(row.clientId)}
              >
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell>{row.projectName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.developmentHours)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.pmHours)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatHours(row.hoursUsed)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y divide-[var(--border)] lg:hidden">
        {rows.map((row) => (
          <button
            key={row.projectId}
            type="button"
            className="flex w-full flex-col gap-2 px-4 py-3.5 text-left"
            onClick={() => onOpenClient(row.clientId)}
          >
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">{row.clientName}</p>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{row.projectName}</p>
            </div>
            <div className="flex items-center justify-between text-sm tabular-nums">
              <span className="text-[var(--muted-foreground)]">
                Dev {formatHours(row.developmentHours)} · PM {formatHours(row.pmHours)}
              </span>
              <span className="font-medium">Total {formatHours(row.hoursUsed)}</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function DashboardSowTable({
  rows,
  SortLabel,
  onOpenClient,
}: {
  rows: DashboardRow[];
  SortLabel: (props: { label: string; column: SortKey }) => ReactNode;
  onOpenClient: (clientId: string) => void;
}) {
  return (
    <>
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortLabel label="Client" column="clientName" /></TableHead>
              <TableHead><SortLabel label="Project" column="projectName" /></TableHead>
              <TableHead className="text-right">Quoted Hours</TableHead>
              <TableHead className="text-right">Development</TableHead>
              <TableHead className="text-right">Delivery Lead</TableHead>
              <TableHead className="text-right">Technical Leadership</TableHead>
              <TableHead className="text-right"><SortLabel label="Total" column="hoursUsed" /></TableHead>
              <TableHead className="text-right"><SortLabel label="Remaining" column="hoursRemaining" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.projectId}
                className="cursor-pointer"
                onClick={() => onOpenClient(row.clientId)}
              >
                <TableCell className="font-medium">{row.clientName}</TableCell>
                <TableCell>{row.projectName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.quotedHours)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.developmentHours)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.deliveryLeadHours)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatHours(row.technicalLeadershipHours)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatHours(row.hoursUsed)}</TableCell>
                <TableCell className="text-right">
                  <HoursRemaining value={row.hoursRemaining} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y divide-[var(--border)] lg:hidden">
        {rows.map((row) => (
          <button
            key={row.projectId}
            type="button"
            className="flex w-full flex-col gap-2 px-4 py-3.5 text-left"
            onClick={() => onOpenClient(row.clientId)}
          >
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">{row.clientName}</p>
              <p className="truncate text-sm text-[var(--muted-foreground)]">{row.projectName}</p>
            </div>
            <div className="flex items-center justify-between text-sm tabular-nums">
              <span className="text-[var(--muted-foreground)]">
                Dev {formatHours(row.developmentHours)} · Lead {formatHours(row.deliveryLeadHours)} · Tech {formatHours(row.technicalLeadershipHours)}
              </span>
              <HoursRemaining value={row.hoursRemaining} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function trendHint(current: number, previous: number) {
  if (!previous) {
    return "vs last month";
  }
  const delta = ((current - previous) / previous) * 100;
  const arrow = delta >= 0 ? "↑" : "↓";
  return `${arrow} ${formatHours(Math.abs(delta))}% vs last month`;
}

export function DashboardView() {
  const router = useRouter();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("clientName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<DashboardResponse>(`/api/dashboard?year=${year}&month=${month}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error: Error) => toast.error(error.message || "We couldn't load the dashboard."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const managedRows = useMemo(
    () => (data?.rows ?? []).filter((row) => row.projectType === "MANAGED_SERVICE"),
    [data],
  );

  const alerts = useMemo(() => {
    return managedRows
      .flatMap((row) => {
        const items: Array<{ id: string; title: string; detail: string }> = [];
        if (row.status === "over_allocation") {
          items.push({
            id: `${row.projectId}-over`,
            title: row.projectName,
            detail: `${row.clientName} · ${formatHoursUnit(Math.abs(row.hoursRemaining ?? 0))} over allocation`,
          });
        } else if (row.status === "at_limit") {
          items.push({
            id: `${row.projectId}-limit`,
            title: row.projectName,
            detail: `${row.clientName} · ${formatHours(utilizationPercent(row.hoursUsed, row.hoursAvailable))}% utilized`,
          });
        }
        if (row.hoursUsed === 0) {
          items.push({
            id: `${row.projectId}-missing`,
            title: row.projectName,
            detail: `${row.clientName} · No hours entered for ${formatYearMonth(year, month)}`,
          });
        }
        return items;
      })
      .slice(0, 6);
  }, [managedRows, month, year]);

  const tableRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = (data?.rows ?? []).filter((row) => {
      if (statusFilter.length > 0 && !statusFilter.includes(row.status)) return false;
      if (!query) return true;
      return (
        row.clientName.toLowerCase().includes(query) ||
        row.projectName.toLowerCase().includes(query) ||
        (row.productionManager ?? "").toLowerCase().includes(query)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "utilization") {
        return ((utilizationPercent(a.hoursUsed, a.hoursAvailable) ?? 0) - (utilizationPercent(b.hoursUsed, b.hoursAvailable) ?? 0)) * dir;
      }
      if (sortKey === "hoursUsed" || sortKey === "hoursRemaining") {
        return ((a[sortKey] ?? 0) - (b[sortKey] ?? 0)) * dir;
      }
      return a[sortKey].localeCompare(b[sortKey]) * dir;
    });
    return sorted;
  }, [data, search, sortDir, sortKey, statusFilter]);

  const groupedRows = useMemo(() => partitionByProjectType(tableRows), [tableRows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "clientName" || key === "projectName" ? "asc" : "desc");
  }

  function SortLabel({ label, column }: { label: string; column: SortKey }) {
    const active = sortKey === column;
    const Icon = sortDir === "asc" ? ArrowUp : ArrowDown;
    return (
      <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column)}>
        {label}
        {active ? <Icon className="h-3 w-3" /> : null}
      </button>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Monitor client utilization and monthly hours for ${formatYearMonth(year, month)}.`}
        actions={<MonthSelector year={year} month={month} onChange={(nextYear, nextMonth) => { setYear(nextYear); setMonth(nextMonth); }} />}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Clients" value={String(data?.cards.totalClients ?? "—")} icon={Users} hint="Active clients" />
        <SummaryCard title="Active Projects" value={String(data?.cards.totalProjects ?? "—")} icon={Briefcase} hint="Active projects" />
        <SummaryCard
          title="Hours Used"
          value={formatHoursUnit(data?.cards.hoursUsed)}
          icon={Clock3}
          hint={data ? trendHint(data.cards.hoursUsed, data.cards.previousHoursUsed) : undefined}
        />
        <SummaryCard
          title="Hours Remaining"
          value={formatHoursUnit(data?.cards.hoursRemaining)}
          icon={Gauge}
          tone={(data?.cards.hoursRemaining ?? 0) < 0 ? "danger" : "success"}
          hint={
            data?.cards.projectsOverAllocation
              ? `${data.cards.projectsOverAllocation} over-allocated`
              : "Managed Service remaining"
          }
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2 p-5">
          <h2 className="mb-4 text-[var(--text-section)] font-semibold text-[var(--foreground)]">Project utilization</h2>
          {loading ? (
            <TableSkeleton rows={5} cols={1} />
          ) : managedRows.length === 0 ? (
            <EmptyState title="No managed service hours" description="Add managed service projects to see utilization." />
          ) : (
            <div className="space-y-4">
              {managedRows.slice(0, 8).map((row) => (
                <UtilizationBar
                  key={row.projectId}
                  label={row.projectName}
                  detail={row.clientName}
                  used={row.hoursUsed}
                  available={row.hoursAvailable}
                  status={row.status}
                />
              ))}
            </div>
          )}
        </Card>
        <Card className="xl:col-span-3 overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[var(--text-section)] font-semibold text-[var(--foreground)]">Attention required</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Over-allocation, 90%+ utilization, and missing time entries.</p>
          </div>
          {loading ? (
            <TableSkeleton rows={4} cols={2} />
          ) : alerts.length === 0 ? (
            <EmptyState title="Nothing needs attention" description="All managed service projects look healthy for this month." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{alert.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{alert.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[var(--text-section)] font-semibold text-[var(--foreground)]">Project status</h2>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:max-w-xl">
            <SearchInput
              placeholder="Search clients or projects"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <FilterMultiSelect
              ariaLabel="Filter by status"
              placeholder="All statuses"
              countNoun="statuses"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "healthy", label: "Healthy" },
                { value: "approaching", label: "Near Limit" },
                { value: "at_limit", label: "At Limit" },
                { value: "over_allocation", label: "Over Allocation" },
                { value: "not_applicable", label: "T&M" },
              ]}
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton />
        ) : tableRows.length === 0 ? (
          <EmptyState title="No matching projects" description="Create a client and project, or try another filter." />
        ) : (
          <>
            {groupedRows.managed.length > 0 ? (
              <>
                <ProjectTypeHeading title="Managed Service" count={groupedRows.managed.length} />
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><SortLabel label="Client" column="clientName" /></TableHead>
                        <TableHead><SortLabel label="Project" column="projectName" /></TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right"><SortLabel label="Used" column="hoursUsed" /></TableHead>
                        <TableHead className="text-right"><SortLabel label="Remaining" column="hoursRemaining" /></TableHead>
                        <TableHead className="text-right"><SortLabel label="Utilization" column="utilization" /></TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedRows.managed.map((row) => {
                        const percent = utilizationPercent(row.hoursUsed, row.hoursAvailable);
                        return (
                        <TableRow
                          key={row.projectId}
                          className="cursor-pointer"
                          onClick={() => router.push(`/clients/${row.clientId}`)}
                        >
                          <TableCell className="font-medium">{row.clientName}</TableCell>
                          <TableCell>{row.projectName}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatHours(row.hoursAvailable)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatHours(row.hoursUsed)}</TableCell>
                          <TableCell className="text-right">
                            <HoursRemaining value={row.hoursRemaining} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className={cn(percent != null && percent > 100 && "font-medium text-[var(--danger)]")}>
                              {`${formatHours(percent)}%`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-[var(--border)] lg:hidden">
                  {groupedRows.managed.map((row) => (
                    <button
                      key={row.projectId}
                      type="button"
                      className="flex w-full flex-col gap-2 px-4 py-3.5 text-left"
                      onClick={() => router.push(`/clients/${row.clientId}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)]">{row.clientName}</p>
                          <p className="truncate text-sm text-[var(--muted-foreground)]">{row.projectName}</p>
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="flex items-center justify-between text-sm tabular-nums">
                        <span className="text-[var(--muted-foreground)]">Used {formatHours(row.hoursUsed)}</span>
                        <HoursRemaining value={row.hoursRemaining} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {groupedRows.timeAndMaterials.length > 0 ? (
              <>
                <ProjectTypeHeading title="Time & Materials" count={groupedRows.timeAndMaterials.length} />
                <DashboardSplitHoursTable
                  rows={groupedRows.timeAndMaterials}
                  SortLabel={SortLabel}
                  onOpenClient={(clientId) => router.push(`/clients/${clientId}`)}
                />
              </>
            ) : null}
            {groupedRows.capitalTimeAndMaterials.length > 0 ? (
              <>
                <ProjectTypeHeading title={PROJECT_TYPE_LABELS.CAPITAL_TIME_AND_MATERIALS} count={groupedRows.capitalTimeAndMaterials.length} />
                <DashboardSplitHoursTable
                  rows={groupedRows.capitalTimeAndMaterials}
                  SortLabel={SortLabel}
                  onOpenClient={(clientId) => router.push(`/clients/${clientId}`)}
                />
              </>
            ) : null}
            {groupedRows.sow.length > 0 ? (
              <>
                <ProjectTypeHeading title={PROJECT_TYPE_LABELS.SOW} count={groupedRows.sow.length} />
                <DashboardSowTable
                  rows={groupedRows.sow}
                  SortLabel={SortLabel}
                  onOpenClient={(clientId) => router.push(`/clients/${clientId}`)}
                />
              </>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
