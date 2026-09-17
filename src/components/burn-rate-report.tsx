"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { groupHeaderBgClass, ProjectTypeHeading } from "@/components/ui/project-type-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BURN_STATUSES,
  formatMoney,
  sortBurnProjects,
  type BurnLine,
  type BurnProject,
  type BurnStatus,
  type BurnTotals,
} from "@/lib/burn-rate";
import { cn, formatHours } from "@/lib/utils";

const ESTIMATE = "bg-[var(--muted)]";
const ACTUAL = "bg-[var(--success-soft)]";
const REMAINING = "bg-[var(--warning-soft)]";
const GROUP = groupHeaderBgClass;

function StatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: BurnStatus;
  disabled?: boolean;
  onChange: (status: BurnStatus) => void;
}) {
  return (
    <select
      aria-label="Project status"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as BurnStatus)}
      className={cn(
        "h-8 max-w-[13.5rem] rounded-full border-0 bg-white/80 px-2.5 text-[calc(11px+1pt)] font-bold shadow-none ring-1 ring-inset ring-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
        statusSelectClass(value),
      )}
      style={{ fontWeight: 700 }}
    >
      {BURN_STATUSES.map((status) => (
        <option key={status} value={status} className="font-bold">
          {status}
        </option>
      ))}
    </select>
  );
}

function statusSelectClass(status: BurnStatus): string {
  if (status === "Complete") return "text-[var(--success)]";
  if (status === "UAT") return "text-[#8B5A2B]";
  if (status === "Pending Deployment") return "text-[var(--info)]";
  if (status === "Not Started") return "text-[var(--muted-foreground)]";
  return "text-[var(--primary)]";
}

function MetricHead({
  label,
  total,
  className,
}: {
  label: string;
  total: string;
  className: string;
}) {
  return (
    <TableHead className={cn("h-auto min-w-[7.5rem] py-2.5 text-right align-bottom normal-case", className)}>
      <div className="text-[calc(11px+1pt)] font-semibold uppercase tracking-[0.06em] text-[var(--secondary)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">{total}</div>
    </TableHead>
  );
}

function MetricCell({
  children,
  className,
  warn,
  emphasis,
}: {
  children: string;
  className: string;
  warn?: boolean;
  emphasis?: boolean;
}) {
  return (
    <TableCell
      className={cn(
        "text-right tabular-nums",
        className,
        emphasis && "font-semibold",
        warn && "text-[var(--danger)]",
        warn && !emphasis && "font-medium",
      )}
    >
      {children}
    </TableCell>
  );
}

function TicketRow({
  project,
  ticket,
  line,
  first,
  emphasis,
  statusSaving,
  onStatusChange,
}: {
  project: BurnProject;
  ticket: string;
  line: Pick<BurnLine, "estimateHours" | "estimateCost" | "actualHours" | "actualSpend" | "remainingHours" | "remainingSpend" | "status">;
  first?: boolean;
  emphasis?: boolean;
  statusSaving?: boolean;
  onStatusChange?: (status: BurnStatus) => void;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      {first ? (
        <TableCell rowSpan={3} className="align-top">
          <p className="font-semibold text-[var(--foreground)]">{project.title}</p>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{project.subtitle ?? project.clientName}</p>
        </TableCell>
      ) : null}
      <TableCell className={cn("font-medium", emphasis && "font-semibold", emphasis && GROUP, !emphasis && "pl-7")}>{ticket}</TableCell>
      <TableCell className={cn(emphasis && "font-semibold", emphasis && GROUP)}>
        {emphasis && onStatusChange ? (
          <StatusSelect value={line.status} disabled={statusSaving} onChange={onStatusChange} />
        ) : null}
      </TableCell>
      <MetricCell className={emphasis ? GROUP : ESTIMATE} emphasis={emphasis}>
        {formatHours(line.estimateHours)}
      </MetricCell>
      <MetricCell className={emphasis ? GROUP : ESTIMATE} emphasis={emphasis}>
        {formatMoney(line.estimateCost, project.currency)}
      </MetricCell>
      <MetricCell className={emphasis ? GROUP : ACTUAL} emphasis={emphasis}>
        {formatHours(line.actualHours)}
      </MetricCell>
      <MetricCell className={emphasis ? GROUP : ACTUAL} emphasis={emphasis}>
        {formatMoney(line.actualSpend, project.currency)}
      </MetricCell>
      <MetricCell className={emphasis ? GROUP : REMAINING} emphasis={emphasis} warn={line.remainingHours < 0}>
        {formatHours(line.remainingHours)}
      </MetricCell>
      <MetricCell className={emphasis ? GROUP : REMAINING} emphasis={emphasis} warn={line.remainingSpend < 0}>
        {formatMoney(line.remainingSpend, project.currency)}
      </MetricCell>
    </TableRow>
  );
}

export function BurnRateReport({
  projects,
  totals,
  statusSavingId,
  onStatusChange,
}: {
  projects: BurnProject[];
  totals: BurnTotals;
  statusSavingId?: string | null;
  onStatusChange?: (projectId: string, status: BurnStatus) => void;
}) {
  if (projects.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState
          title="No burn rate rows"
          description="Add Capital-Time & Material projects with estimates, or adjust filters."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ProjectTypeHeading title="Burn Rate" count={projects.length} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-auto min-w-[12rem] py-2.5 align-bottom">Project</TableHead>
            <TableHead className="h-auto py-2.5 align-bottom">Ticket</TableHead>
            <TableHead className="h-auto py-2.5 align-bottom">Status</TableHead>
            <MetricHead label="Estimate (Hr)" total={formatHours(totals.estimateHours)} className={ESTIMATE} />
            <MetricHead
              label="Estimate (cost)"
              total={formatMoney(totals.estimateCost, totals.currency)}
              className={ESTIMATE}
            />
            <MetricHead label="Actual" total={formatHours(totals.actualHours)} className={ACTUAL} />
            <MetricHead
              label="Actual (Spend)"
              total={formatMoney(totals.actualSpend, totals.currency)}
              className={ACTUAL}
            />
            <MetricHead
              label="Remaining (Hr)"
              total={formatHours(totals.remainingHours)}
              className={REMAINING}
            />
            <MetricHead
              label="Remaining (Spend)"
              total={formatMoney(totals.remainingSpend, totals.currency)}
              className={REMAINING}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortBurnProjects(projects).map((project) => (
            <BurnProjectRows
              key={project.projectId}
              project={project}
              statusSaving={statusSavingId === project.projectId}
              onStatusChange={onStatusChange}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function BurnProjectRows({
  project,
  statusSaving,
  onStatusChange,
}: {
  project: BurnProject;
  statusSaving?: boolean;
  onStatusChange?: (projectId: string, status: BurnStatus) => void;
}) {
  return (
    <>
      <TicketRow
        project={project}
        ticket="Total"
        line={project.total}
        first
        emphasis
        statusSaving={statusSaving}
        onStatusChange={onStatusChange ? (status) => onStatusChange(project.projectId, status) : undefined}
      />
      <TicketRow project={project} ticket={project.pm.ticket} line={project.pm} />
      <TicketRow project={project} ticket={project.dev.ticket} line={project.dev} />
    </>
  );
}
