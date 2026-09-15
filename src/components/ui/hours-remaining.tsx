import { AlertTriangle } from "lucide-react";
import { cn, formatHours, formatSignedHours } from "@/lib/utils";

export function HoursRemaining({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-[var(--muted-foreground)]">—</span>;
  }
  const tone =
    value < 0
      ? "bg-[var(--danger-soft)] text-[var(--danger)]"
      : value > 0
        ? "bg-[var(--success-soft)] text-[var(--success)]"
        : "bg-[var(--muted)] text-[var(--muted-foreground)]";
  const label = value < 0 ? "Over allocation" : value > 0 ? "Hours remaining" : "Fully used";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 font-medium tabular-nums",
        tone,
      )}
    >
      {value < 0 ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
      <span>
        {value === 0 ? formatHours(0) : formatSignedHours(value)}
        <span className="sr-only"> hrs ({label})</span>
      </span>
    </span>
  );
}
