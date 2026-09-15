import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "success" | "warning" | "danger" | "neutral" | "outline";
}) {
  const variants = {
    default: "bg-blue-50 text-[var(--primary)] ring-blue-100",
    success: "bg-[var(--success-soft)] text-[var(--success)] ring-emerald-100",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] ring-amber-100",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] ring-red-100",
    neutral: "bg-[var(--muted)] text-[var(--muted-foreground)] ring-[var(--border)]",
    outline: "bg-[var(--surface)] text-[var(--muted-foreground)] ring-[var(--border)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
