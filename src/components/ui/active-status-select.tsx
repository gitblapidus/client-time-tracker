"use client";

import { cn } from "@/lib/utils";

export function ActiveStatusSelect({
  id,
  value,
  onChange,
  disabled,
  label,
  title,
  fullWidth,
}: {
  id?: string;
  value: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
  label?: string;
  title?: string;
  fullWidth?: boolean;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      title={title}
      disabled={disabled}
      className={cn(
        "rounded-[var(--radius-md)] border px-2 text-sm",
        fullWidth ? "h-10 w-full bg-[var(--surface)]" : "h-9",
        value
          ? "border-emerald-200 bg-[var(--success-soft)] text-emerald-800"
          : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]",
      )}
      value={value ? "true" : "false"}
      onChange={(event) => onChange(event.target.value === "true")}
    >
      <option value="true">Active</option>
      <option value="false">Inactive</option>
    </select>
  );
}
