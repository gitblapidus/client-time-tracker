import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-blue-50 text-[var(--primary)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[var(--text-muted)] font-medium text-[var(--muted-foreground)]">{title}</p>
          <p
            className={cn(
              "mt-1.5 text-2xl font-semibold tracking-tight tabular-nums",
              tone === "danger" ? "text-[var(--danger)]" : "text-[var(--foreground)]",
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-[var(--text-muted)] text-[var(--muted-foreground)]">{hint}</p> : null}
        </div>
        <div className={cn("rounded-[var(--radius-md)] p-2", tones[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
    </Card>
  );
}
