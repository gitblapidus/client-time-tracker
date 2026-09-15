"use client";

import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FilterOption = {
  value: string;
  label: string;
};

export function FilterMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  countNoun,
  ariaLabel,
  className,
}: {
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  countNoun?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? (selectedLabels[0] ?? placeholder)
        : `${value.length} ${countNoun ?? "selected"}`;

  function toggle(optionValue: string, checked: boolean) {
    if (checked) {
      if (value.includes(optionValue)) return;
      onChange([...value, optionValue]);
      return;
    }
    onChange(value.filter((item) => item !== optionValue));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ? `${ariaLabel}: ${summary}` : summary}
          className={cn(
            "inline-flex h-10 min-w-[11rem] items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            className,
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-auto"
      >
        {options.length === 0 ? (
          <div className="px-2.5 py-2 text-sm text-[var(--muted-foreground)]">No options</div>
        ) : (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              textValue={option.label}
              aria-label={option.label}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => toggle(option.value, checked === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        )}
        {value.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>Clear</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
