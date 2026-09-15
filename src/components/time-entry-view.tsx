"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { calculateMonthSnapshot, isManagedService, type ProjectType, type UtilizationStatus } from "@/lib/calculations";
import { currentYearMonth, formatYearMonth } from "@/lib/months";
import { partitionByProjectType, totalTmHours } from "@/lib/time-hours";
import { formatHours, formatHoursUnit, nextMonthHint } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterMultiSelect } from "@/components/ui/filter-multi-select";
import { HoursRemaining } from "@/components/ui/hours-remaining";
import { MonthSelector } from "@/components/ui/month-selector";
import { NumericInput } from "@/components/ui/numeric-input";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectTypeHeading } from "@/components/ui/project-type-heading";
import { TableSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryCard } from "@/components/ui/summary-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock3, Gauge, Percent, Wallet } from "lucide-react";

type TimeRow = {
  projectId: string;
  clientId: string;
  clientName: string;
  projectName: string;
  productionManager: string | null;
  projectType: ProjectType | string;
  monthlyHours: number | null;
  maximumCarryoverHours: number | null;
  year: number;
  month: number;
  hoursUsed: number;
  developmentHours: number | null;
  pmHours: number | null;
  carryoverUsed: number | null;
  hoursAvailable: number | null;
  hoursRemaining: number | null;
  hoursForNextMonth: number | null;
  status: UtilizationStatus;
};

type DraftHours = {
  hoursUsed: number;
  developmentHours: number;
  pmHours: number;
};

function draftFromRow(row: TimeRow): DraftHours {
  if (isManagedService(row.projectType)) {
    return { hoursUsed: row.hoursUsed, developmentHours: 0, pmHours: 0 };
  }
  return {
    hoursUsed: row.hoursUsed,
    developmentHours: row.developmentHours ?? row.hoursUsed,
    pmHours: row.pmHours ?? 0,
  };
}

function liveRow(row: TimeRow, draft: DraftHours): TimeRow {
  const hoursUsed = isManagedService(row.projectType)
    ? draft.hoursUsed
    : totalTmHours(draft.developmentHours, draft.pmHours);
  const prior = isManagedService(row.projectType) ? (row.carryoverUsed ?? 0) : 0;
  const snapshot = calculateMonthSnapshot(
    {
      type: row.projectType as ProjectType,
      monthlyHours: row.monthlyHours,
      maximumCarryoverHours: row.maximumCarryoverHours,
      openingCarryoverHours: null,
      createdYear: row.year,
      createdMonth: row.month,
    },
    hoursUsed,
    prior,
  );
  return {
    ...row,
    ...snapshot,
    hoursUsed,
    developmentHours: isManagedService(row.projectType) ? null : draft.developmentHours,
    pmHours: isManagedService(row.projectType) ? null : draft.pmHours,
  };
}

function draftsEqual(row: TimeRow, draft: DraftHours | undefined) {
  const current = draft ?? draftFromRow(row);
  if (isManagedService(row.projectType)) {
    return current.hoursUsed === row.hoursUsed;
  }
  return (
    current.developmentHours === (row.developmentHours ?? row.hoursUsed) &&
    current.pmHours === (row.pmHours ?? 0)
  );
}

function HoursAlign({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

function HoursReadout({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 w-[5.5rem] items-center justify-end px-2 font-medium tabular-nums">
      {children}
    </span>
  );
}

export function TimeEntryView() {
  const router = useRouter();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [rows, setRows] = useState<TimeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftHours>>({});
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<{ year: number; month: number } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function applyRows(nextRows: TimeRow[]) {
    setRows(nextRows);
    setDrafts(Object.fromEntries(nextRows.map((row) => [row.projectId, draftFromRow(row)])));
  }

  function load(nextYear = year, nextMonth = month) {
    setLoading(true);
    api<{ rows: TimeRow[] }>(`/api/time-entries?year=${nextYear}&month=${nextMonth}`)
      .then((result) => applyRows(result.rows))
      .catch((error: Error) => toast.error(error.message || "We couldn't load time entries."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const dirty = useMemo(
    () => rows.some((row) => !draftsEqual(row, drafts[row.projectId])),
    [rows, drafts],
  );

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (!dirty) return;
      const anchor = (event.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href");
      if (href?.startsWith("/")) {
        event.preventDefault();
        event.stopPropagation();
        setPendingHref(href);
        setLeaveOpen(true);
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function updateDraft(projectId: string, patch: Partial<DraftHours>) {
    setDrafts((current) => {
      const row = rows.find((item) => item.projectId === projectId);
      const previous = current[projectId] ?? (row ? draftFromRow(row) : { hoursUsed: 0, developmentHours: 0, pmHours: 0 });
      const next = { ...previous, ...patch };
      if (patch.developmentHours != null || patch.pmHours != null) {
        next.hoursUsed = totalTmHours(next.developmentHours, next.pmHours);
      }
      return { ...current, [projectId]: next };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const result = await api<{ rows: TimeRow[] }>("/api/time-entries", {
        method: "PUT",
        body: JSON.stringify({
          year,
          month,
          entries: rows.map((row) => {
            const draft = drafts[row.projectId] ?? draftFromRow(row);
            if (isManagedService(row.projectType)) {
              return { projectId: row.projectId, hoursUsed: draft.hoursUsed };
            }
            return {
              projectId: row.projectId,
              developmentHours: draft.developmentHours,
              pmHours: draft.pmHours,
            };
          }),
        }),
      });
      applyRows(result.rows);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
      toast.success("Time entries saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const clients = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      if (!seen.has(row.clientId)) {
        seen.set(row.clientId, row.clientName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const managers = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (row.productionManager) {
        names.add(row.productionManager);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const hasUnassignedManager = rows.some((row) => !row.productionManager);

  const displayRows = rows
    .filter((row) => {
      if (clientFilter.length > 0 && !clientFilter.includes(row.clientId)) {
        return false;
      }
      const managerKey = row.productionManager ?? "unassigned";
      if (managerFilter.length > 0 && !managerFilter.includes(managerKey)) {
        return false;
      }
      return true;
    })
    .map((row) => liveRow(row, drafts[row.projectId] ?? draftFromRow(row)));

  const { managed, timeAndMaterials } = partitionByProjectType(displayRows);
  const totalAvailable = managed.reduce((sum, row) => sum + (row.hoursAvailable ?? 0), 0);
  const totalUsed = displayRows.reduce((sum, row) => sum + row.hoursUsed, 0);
  const totalRemaining = managed.reduce((sum, row) => sum + (row.hoursRemaining ?? 0), 0);
  const utilization = totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0;
  const tmDevelopment = timeAndMaterials.reduce((sum, row) => sum + (row.developmentHours ?? 0), 0);
  const tmPm = timeAndMaterials.reduce((sum, row) => sum + (row.pmHours ?? 0), 0);
  const tmTotal = timeAndMaterials.reduce((sum, row) => sum + row.hoursUsed, 0);

  return (
    <div className={dirty ? "pb-20 sm:pb-0" : undefined}>
      <PageHeader
        title="Time Entry"
        description={`Enter monthly hours used by project for ${formatYearMonth(year, month)}.`}
        actions={
          <>
            {dirty ? (
              <span className="hidden rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning)] sm:inline">
                Unsaved changes
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-medium text-[var(--success)]">
                <Check className="h-3.5 w-3.5" />
                Changes saved
              </span>
            ) : null}
            <MonthSelector year={year} month={month} onChange={(nextYear, nextMonth) => {
              if (dirty) {
                setPendingMonth({ year: nextYear, month: nextMonth });
                return;
              }
              setYear(nextYear);
              setMonth(nextMonth);
            }} />
            <Button className="hidden sm:inline-flex" onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Available" value={formatHoursUnit(totalAvailable)} icon={Wallet} hint={`${managed.length} managed service projects`} />
        <SummaryCard title="Total Used" value={formatHoursUnit(totalUsed)} icon={Clock3} />
        <SummaryCard title="Remaining" value={formatHoursUnit(totalRemaining)} icon={Gauge} tone={totalRemaining < 0 ? "danger" : "success"} />
        <SummaryCard title="Utilization" value={`${formatHours(utilization)}%`} icon={Percent} tone={utilization > 100 ? "danger" : utilization >= 90 ? "warning" : "default"} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
          <FilterMultiSelect
            ariaLabel="Filter by client"
            placeholder="All clients"
            countNoun="clients"
            value={clientFilter}
            onChange={setClientFilter}
            options={clients.map((client) => ({ value: client.id, label: client.name }))}
          />
          <FilterMultiSelect
            ariaLabel="Filter by project manager"
            placeholder="All project managers"
            countNoun="project managers"
            value={managerFilter}
            onChange={setManagerFilter}
            options={[
              ...(hasUnassignedManager ? [{ value: "unassigned", label: "Unassigned" }] : []),
              ...managers.map((name) => ({ value: name, label: name })),
            ]}
          />
        </div>
        {loading ? (
          <TableSkeleton cols={8} />
        ) : rows.length === 0 ? (
          <EmptyState title={`No hours entered for ${formatYearMonth(year, month)}`} description="Add clients and projects in Administration before entering time." />
        ) : displayRows.length === 0 ? (
          <EmptyState title="No matching projects" description="Try another client or project manager filter." />
        ) : (
          <>
            {managed.length > 0 ? (
              <>
                <ProjectTypeHeading title="Managed Service" count={managed.length} />
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Project Manager</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right pr-6">Used</TableHead>
                        <TableHead className="text-right">Remaining</TableHead>
                        <TableHead className="text-right">Max Carryover</TableHead>
                        <TableHead className="text-right">Next Month</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managed.map((row) => (
                        <TableRow key={row.projectId}>
                          <TableCell className="font-medium">{row.clientName}</TableCell>
                          <TableCell className="font-medium">{row.projectName}</TableCell>
                          <TableCell>{row.productionManager ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatHours(row.hoursAvailable)}</TableCell>
                          <TableCell>
                            <HoursAlign>
                              <NumericInput
                                aria-label={`Hours used for ${row.projectName}`}
                                value={drafts[row.projectId]?.hoursUsed ?? 0}
                                onValueChange={(value) => updateDraft(row.projectId, { hoursUsed: value })}
                              />
                            </HoursAlign>
                          </TableCell>
                          <TableCell className="text-right">
                            <HoursRemaining value={row.hoursRemaining} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-[var(--muted-foreground)]">{formatHours(row.maximumCarryoverHours)}</TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium tabular-nums">{formatHours(row.hoursForNextMonth)}</div>
                            {nextMonthHint(row) ? (
                              <div className="text-[11px] text-[var(--primary)]">{nextMonthHint(row)}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-[var(--border)] lg:hidden">
                  {managed.map((row) => (
                    <div key={row.projectId} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)]">{row.clientName}</p>
                          <p className="text-sm text-[var(--foreground)]">{row.projectName}</p>
                          {row.productionManager ? (
                            <p className="text-[11px] text-[var(--muted-foreground)]">{row.productionManager}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Available</p>
                          <p className="tabular-nums">{formatHours(row.hoursAvailable)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Used</p>
                          <NumericInput
                            aria-label={`Hours used for ${row.projectName}`}
                            className="w-full"
                            value={drafts[row.projectId]?.hoursUsed ?? 0}
                            onValueChange={(value) => updateDraft(row.projectId, { hoursUsed: value })}
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Remaining</p>
                          <HoursRemaining value={row.hoursRemaining} />
                        </div>
                        <div>
                          <p className="text-[11px] text-[var(--muted-foreground)]">Next month</p>
                          <p className="font-medium tabular-nums">{formatHours(row.hoursForNextMonth)}</p>
                          {nextMonthHint(row) ? (
                            <p className="text-[11px] text-[var(--primary)]">{nextMonthHint(row)}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {timeAndMaterials.length > 0 ? (
              <>
                <ProjectTypeHeading title="Time & Materials" count={timeAndMaterials.length} />
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Project Manager</TableHead>
                        <TableHead className="whitespace-nowrap text-right pr-6">Development Hours</TableHead>
                        <TableHead className="whitespace-nowrap text-right pr-6">PM Hours</TableHead>
                        <TableHead className="whitespace-nowrap text-right pr-6">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeAndMaterials.map((row) => {
                        const draft = drafts[row.projectId] ?? draftFromRow(row);
                        return (
                          <TableRow key={row.projectId}>
                            <TableCell className="font-medium">{row.clientName}</TableCell>
                            <TableCell className="font-medium">{row.projectName}</TableCell>
                            <TableCell>{row.productionManager ?? "—"}</TableCell>
                            <TableCell>
                              <HoursAlign>
                                <NumericInput
                                  aria-label={`Development hours for ${row.projectName}`}
                                  value={draft.developmentHours}
                                  onValueChange={(value) => updateDraft(row.projectId, { developmentHours: value })}
                                />
                              </HoursAlign>
                            </TableCell>
                            <TableCell>
                              <HoursAlign>
                                <NumericInput
                                  aria-label={`PM hours for ${row.projectName}`}
                                  value={draft.pmHours}
                                  onValueChange={(value) => updateDraft(row.projectId, { pmHours: value })}
                                />
                              </HoursAlign>
                            </TableCell>
                            <TableCell>
                              <HoursAlign>
                                <HoursReadout>
                                  {formatHours(totalTmHours(draft.developmentHours, draft.pmHours))}
                                </HoursReadout>
                              </HoursAlign>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={3} className="font-medium text-[var(--muted-foreground)]">Total</TableCell>
                        <TableCell>
                          <HoursAlign>
                            <HoursReadout>{formatHours(tmDevelopment)}</HoursReadout>
                          </HoursAlign>
                        </TableCell>
                        <TableCell>
                          <HoursAlign>
                            <HoursReadout>{formatHours(tmPm)}</HoursReadout>
                          </HoursAlign>
                        </TableCell>
                        <TableCell>
                          <HoursAlign>
                            <HoursReadout>{formatHours(tmTotal)}</HoursReadout>
                          </HoursAlign>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="divide-y divide-[var(--border)] lg:hidden">
                  {timeAndMaterials.map((row) => {
                    const draft = drafts[row.projectId] ?? draftFromRow(row);
                    return (
                      <div key={row.projectId} className="space-y-3 px-4 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)]">{row.clientName}</p>
                          <p className="text-sm text-[var(--foreground)]">{row.projectName}</p>
                          {row.productionManager ? (
                            <p className="text-[11px] text-[var(--muted-foreground)]">{row.productionManager}</p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[11px] text-[var(--muted-foreground)]">Development Hours</p>
                            <NumericInput
                              aria-label={`Development hours for ${row.projectName}`}
                              className="w-full"
                              value={draft.developmentHours}
                              onValueChange={(value) => updateDraft(row.projectId, { developmentHours: value })}
                            />
                          </div>
                          <div>
                            <p className="text-[11px] text-[var(--muted-foreground)]">PM Hours</p>
                            <NumericInput
                              aria-label={`PM hours for ${row.projectName}`}
                              className="w-full"
                              value={draft.pmHours}
                              onValueChange={(value) => updateDraft(row.projectId, { pmHours: value })}
                            />
                          </div>
                          <div className="col-span-2">
                            <p className="text-[11px] text-[var(--muted-foreground)]">Total</p>
                            <p className="font-medium tabular-nums">{formatHours(totalTmHours(draft.developmentHours, draft.pmHours))}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </>
        )}
      </Card>
      {dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)] sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--warning)]">Unsaved changes</span>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingMonth)}
        onOpenChange={(open) => {
          if (!open) setPendingMonth(null);
        }}
        title="Switch months?"
        description="You have unsaved hour changes. Switching months will discard them."
        confirmLabel="Switch month"
        onConfirm={() => {
          if (!pendingMonth) return;
          setYear(pendingMonth.year);
          setMonth(pendingMonth.month);
          setPendingMonth(null);
        }}
      />
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveOpen(false);
            setPendingHref(null);
          }
        }}
        title="Leave Time Entry?"
        description="You have unsaved hour changes. Leave this page anyway?"
        confirmLabel="Leave page"
        onConfirm={() => {
          if (pendingHref) router.push(pendingHref);
          setLeaveOpen(false);
          setPendingHref(null);
        }}
      />
    </div>
  );
}
