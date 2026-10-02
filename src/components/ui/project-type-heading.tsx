import { cn } from "@/lib/utils";

/** Shared grouping header tint. Use this (or ProjectTypeHeading / TableSectionRow) for all grouping bars. */
export const groupHeaderBgClass = "bg-[color-mix(in_srgb,var(--primary)_25%,white)]";

export function ProjectTypeHeading({
  title,
  count,
  className,
}: {
  title: string;
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-[var(--border)] px-4 py-2.5", groupHeaderBgClass, className)}>
      <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--secondary)]">
        {title}{count != null ? ` (${count})` : null}
      </h3>
    </div>
  );
}
