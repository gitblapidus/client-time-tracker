"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentYearMonth, formatYearMonth, shiftYearMonth } from "@/lib/months";

export function MonthSelector({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const prev = shiftYearMonth(year, month, -1);
  const next = shiftYearMonth(year, month, 1);
  const current = currentYearMonth();
  const isCurrent = year === current.year && month === current.month;

  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-sm)]">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Previous month"
        onClick={() => onChange(prev.year, prev.month)}
      >
        <ChevronLeft />
      </Button>
      <div className="relative min-w-[11rem] text-center">
        <div className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
          {formatYearMonth(year, month)}
          <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" aria-hidden />
        </div>
        <label className="sr-only" htmlFor="month-input">
          Select month
        </label>
        <input
          id="month-input"
          type="month"
          title="Choose a month"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={`${year}-${String(month).padStart(2, "0")}`}
          onChange={(event) => {
            const [nextYear, nextMonth] = event.target.value.split("-").map(Number);
            if (nextYear && nextMonth) {
              onChange(nextYear, nextMonth);
            }
          }}
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Next month"
        onClick={() => onChange(next.year, next.month)}
      >
        <ChevronRight />
      </Button>
      {isCurrent ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mr-1"
          onClick={() => onChange(current.year, current.month)}
        >
          This month
        </Button>
      )}
    </div>
  );
}
