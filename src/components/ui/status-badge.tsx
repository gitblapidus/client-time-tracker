import type { UtilizationStatus } from "@/lib/calculations";
import { Badge } from "@/components/ui/badge";

const STATUS_COPY: Record<UtilizationStatus, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  healthy: { label: "Healthy", variant: "success" },
  approaching: { label: "Near Limit", variant: "warning" },
  at_limit: { label: "At Limit", variant: "warning" },
  over_allocation: { label: "Over Allocation", variant: "danger" },
  not_applicable: { label: "T&M", variant: "neutral" },
};

export function StatusBadge({ status }: { status: UtilizationStatus }) {
  const config = STATUS_COPY[status];
  return (
    <Badge variant={config.variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {config.label}
    </Badge>
  );
}
