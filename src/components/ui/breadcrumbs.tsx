import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" /> : null}
            {item.href && !last ? (
              <Link href={item.href} className="truncate text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                {item.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-[var(--foreground)]">{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
