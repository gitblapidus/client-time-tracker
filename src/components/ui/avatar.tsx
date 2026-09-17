import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-[var(--secondary)] text-[calc(11px+1pt)] font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {initials(name || "User")}
    </div>
  );
}
