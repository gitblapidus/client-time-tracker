import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return rounded.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export function formatHoursUnit(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${formatHours(value, digits)} hrs`;
}

export function nextMonthHint(row: {
  projectType: string;
  hoursForNextMonth: number | null | undefined;
  monthlyHours: number | null | undefined;
}): string | null {
  if (row.projectType !== "MANAGED_SERVICE" || row.hoursForNextMonth == null || row.monthlyHours == null) {
    return null;
  }
  const delta = Math.round((row.hoursForNextMonth - row.monthlyHours) * 10) / 10;
  if (delta > 0) return `Includes ${formatHours(delta)} hrs carryover`;
  if (delta < 0) return `${formatHours(Math.abs(delta))} hrs overage deducted`;
  return "Standard monthly allocation";
}

export function formatSignedHours(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  const abs = formatHours(Math.abs(value));
  if (value > 0) {
    return `+${abs}`;
  }
  if (value < 0) {
    return `-${abs}`;
  }
  return formatHours(0);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "DSS Partners";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
