import * as React from "react";
import { cn } from "@/lib/utils";
import { groupHeaderBgClass } from "@/components/ui/project-type-heading";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-[var(--text-table)]", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("sticky top-0 z-10 bg-[var(--surface-muted)] text-[var(--muted-foreground)]", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-[var(--border)]", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("transition-colors duration-150 hover:bg-[var(--surface-muted)]", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "h-10 px-4 text-left align-middle text-[calc(11px+1pt)] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-2.5 align-middle text-[var(--foreground)]", className)} {...props} />;
}

export function TableSectionRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableRow className={cn(groupHeaderBgClass, "hover:bg-[color-mix(in_srgb,var(--primary)_25%,white)]")}>
      <TableCell
        colSpan={colSpan}
        className={cn(
          groupHeaderBgClass,
          "py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-[var(--secondary)]",
        )}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}
