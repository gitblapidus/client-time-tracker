import { addMonths, monthKey } from "@/lib/calculations";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface YearMonth {
  year: number;
  month: number;
}

export function currentYearMonth(date = new Date()): YearMonth {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function formatYearMonth(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function parseYearMonth(value: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) {
    return null;
  }
  return { year, month };
}

export function toYearMonthInput(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftYearMonth(year: number, month: number, delta: number): YearMonth {
  return addMonths(year, month, delta);
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return monthKey(a.year, a.month) - monthKey(b.year, b.month);
}

export function isValidYearMonth(year: number, month: number): boolean {
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12 && year >= 2000 && year <= 2100;
}

export type MonthRangePreset = "current" | "previous" | "custom";

export function monthRangeForPreset(
  preset: Exclude<MonthRangePreset, "custom">,
  date = new Date(),
): { start: string; end: string } {
  const current = currentYearMonth(date);
  const selected = preset === "current" ? current : shiftYearMonth(current.year, current.month, -1);
  const value = toYearMonthInput(selected.year, selected.month);
  return { start: value, end: value };
}

export function detectMonthRangePreset(start: string, end: string, date = new Date()): MonthRangePreset {
  if (start !== end) return "custom";
  if (start === monthRangeForPreset("current", date).start) return "current";
  if (start === monthRangeForPreset("previous", date).start) return "previous";
  return "custom";
}
