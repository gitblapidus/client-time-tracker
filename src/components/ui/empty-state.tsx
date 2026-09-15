import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-3 rounded-full bg-[var(--muted)] p-3 text-[var(--muted-foreground)]">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
