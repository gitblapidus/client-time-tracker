import { cn, formatHours } from "@/lib/utils";
import type { UtilizationStatus } from "@/lib/calculations";

export function utilizationPercent(used: number, available: number | null): number | null {
  if (available == null || available <= 0) {
    return used > 0 ? 100 : 0;
  }
  return Math.round((used / available) * 1000) / 10;
}

export function UtilizationBar({
  used,
  available,
  status,
  label,
  detail,
}: {
  used: number;
  available: number | null;
  status: UtilizationStatus;
  label: string;
  detail?: string;
}) {
  const percent = utilizationPercent(used, available) ?? 0;
  const width = Math.min(Math.max(percent, 0), 100);
  const tone =
    status === "over_allocation"
      ? "bg-[var(--danger)]"
      : status === "at_limit" || status === "approaching"
        ? "bg-[var(--warning)]"
        : "bg-[var(--primary)]";

  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <span className="block truncate font-medium text-[var(--foreground)]">{label}</span>
          {detail ? <span className="block truncate text-[11px] text-[var(--muted-foreground)]">{detail}</span> : null}
        </div>
        <span className="shrink-0 tabular-nums text-[var(--muted-foreground)]">
          {formatHours(percent)}%
          {status === "over_allocation" ? (
            <span className="ml-2 font-semibold text-[var(--danger)]">OVER</span>
          ) : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div className={cn("h-full rounded-full transition-[width] duration-200", tone)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
