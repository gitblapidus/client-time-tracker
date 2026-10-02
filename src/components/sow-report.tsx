"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HoursRemaining } from "@/components/ui/hours-remaining";
import { groupHeaderBgClass, ProjectTypeHeading } from "@/components/ui/project-type-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROJECT_TYPE_LABELS } from "@/lib/calculations";
import { sowProjectLabel, sowReportTotals, type SowReportRow } from "@/lib/sow-report";
import { cn, formatHours } from "@/lib/utils";

export function SowReport({ rows }: { rows: SowReportRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="overflow-hidden">
        <EmptyState title="No SOW projects" description="Add SOW projects or adjust filters." />
      </Card>
    );
  }
  const totals = sowReportTotals(rows);
  return (
    <Card className="overflow-hidden">
      <ProjectTypeHeading title={PROJECT_TYPE_LABELS.SOW} count={rows.length} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Quoted Hours</TableHead>
            <TableHead className="text-right">Development</TableHead>
            <TableHead className="text-right">Delivery Lead</TableHead>
            <TableHead className="text-right">Technical Leadership</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.projectId}>
              <TableCell className="font-medium">{sowProjectLabel(row)}</TableCell>
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
          <TableRow className={cn(groupHeaderBgClass, "font-semibold hover:bg-[color-mix(in_srgb,var(--primary)_25%,white)]")}>
            <TableCell>Total</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(totals.quotedHours)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(totals.developmentHours)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(totals.deliveryLeadHours)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(totals.technicalLeadershipHours)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(totals.hoursUsed)}</TableCell>
            <TableCell className="text-right">
              <HoursRemaining value={totals.hoursRemaining} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
