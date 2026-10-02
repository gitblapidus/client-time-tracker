export const PROJECT_TYPES = ["MANAGED_SERVICE", "TIME_AND_MATERIALS", "CAPITAL_TIME_AND_MATERIALS", "SOW"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const TRACKED_PROJECT_TYPES = [
  "MANAGED_SERVICE",
  "TIME_AND_MATERIALS",
  "CAPITAL_TIME_AND_MATERIALS",
  "SOW",
] as const;
export type TrackedProjectType = (typeof TRACKED_PROJECT_TYPES)[number];

export const OVERVIEW_REPORT_TYPES = [
  "MANAGED_SERVICE",
  "TIME_AND_MATERIALS",
  "CAPITAL_TIME_AND_MATERIALS",
] as const;

export const PROJECT_CURRENCIES = ["USD", "EUR"] as const;
export type ProjectCurrency = (typeof PROJECT_CURRENCIES)[number];

export const PROJECT_CURRENCY_SYMBOLS: Record<ProjectCurrency, string> = {
  USD: "$",
  EUR: "€",
};

export function currencySymbol(currency: string | null | undefined): string {
  return currency === "EUR" ? PROJECT_CURRENCY_SYMBOLS.EUR : PROJECT_CURRENCY_SYMBOLS.USD;
}

export function inheritedCapitalRates(client?: {
  currency?: string | null;
  devRate?: number | null;
  pmRate?: number | null;
} | null) {
  return {
    currency: (client?.currency === "EUR" ? "EUR" : "USD") as ProjectCurrency,
    devRate: typeof client?.devRate === "number" && Number.isFinite(client.devRate) ? client.devRate : 0,
    pmRate: typeof client?.pmRate === "number" && Number.isFinite(client.pmRate) ? client.pmRate : 0,
  };
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  MANAGED_SERVICE: "Managed Service",
  TIME_AND_MATERIALS: "Time & Materials",
  CAPITAL_TIME_AND_MATERIALS: "Capital-Time & Material",
  SOW: "SOW",
};

export const UTILIZATION_STATUSES = [
  "healthy",
  "approaching",
  "at_limit",
  "over_allocation",
  "not_applicable",
] as const;
export type UtilizationStatus = (typeof UTILIZATION_STATUSES)[number];

export interface ProjectConfig {
  type: ProjectType;
  monthlyHours: number | null;
  maximumCarryoverHours: number | null;
  openingCarryoverHours: number | null;
  startYear: number;
  startMonth: number;
}

export interface TimeEntryInput {
  year: number;
  month: number;
  hoursUsed: number;
}

export interface MonthSnapshot {
  year: number;
  month: number;
  hoursUsed: number;
  carryoverUsed: number | null;
  hoursAvailable: number | null;
  hoursRemaining: number | null;
  hoursForNextMonth: number | null;
  utilizationPercent: number | null;
  status: UtilizationStatus;
}

export function isManagedService(type: ProjectType | string): boolean {
  return type === "MANAGED_SERVICE";
}

export function isTimeAndMaterials(type: ProjectType | string): boolean {
  return type === "TIME_AND_MATERIALS";
}

export function isCapitalTimeAndMaterials(type: ProjectType | string): boolean {
  return type === "CAPITAL_TIME_AND_MATERIALS";
}

export function isSow(type: ProjectType | string): boolean {
  return type === "SOW";
}

export function usesSplitHours(type: ProjectType | string): boolean {
  return isTimeAndMaterials(type) || isCapitalTimeAndMaterials(type);
}

export function usesSimpleHours(type: ProjectType | string): boolean {
  return isManagedService(type) || isSow(type);
}

export function isTimeTrackedProject(type: ProjectType | string): boolean {
  return usesSimpleHours(type) || usesSplitHours(type);
}

export function monthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function fromMonthKey(key: number): { year: number; month: number } {
  return { year: Math.floor(key / 12), month: (key % 12) + 1 };
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  return fromMonthKey(monthKey(year, month) + delta);
}

export function roundHours(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Carryover into the current month is unused hours from the prior month,
 * never more than Maximum Carryover Hours. Over-allocation (negative remaining)
 * reduces this month's available hours and is not capped.
 */
export function calculateCarryoverUsed(
  priorRemaining: number,
  maximumCarryoverHours: number,
): number {
  if (priorRemaining <= 0) {
    return roundHours(priorRemaining);
  }
  return roundHours(Math.min(priorRemaining, maximumCarryoverHours));
}

export function calculateHoursAvailable(
  monthlyHours: number,
  carryoverUsed: number,
): number {
  return roundHours(monthlyHours + carryoverUsed);
}

export function calculateHoursRemaining(
  hoursAvailable: number,
  hoursUsed: number,
): number {
  return roundHours(hoursAvailable - hoursUsed);
}

/**
 * Preview of next month's available hours.
 * Negative remaining is subtracted from next month's monthly hours.
 * Unused remaining still cannot push next month above 2 × monthly hours.
 */
export function calculateNextMonthHours(
  hoursRemaining: number,
  monthlyHours: number,
): number {
  return roundHours(Math.min(hoursRemaining + monthlyHours, 2 * monthlyHours));
}

export function calculateUtilizationPercent(
  hoursUsed: number,
  hoursAvailable: number,
): number {
  if (hoursAvailable <= 0) {
    return hoursUsed > 0 ? 100 : 0;
  }
  return roundHours((hoursUsed / hoursAvailable) * 100);
}

export function getUtilizationStatus(
  utilizationPercent: number | null,
): UtilizationStatus {
  if (utilizationPercent == null) {
    return "not_applicable";
  }
  if (utilizationPercent > 100) {
    return "over_allocation";
  }
  if (utilizationPercent >= 90) {
    return "at_limit";
  }
  if (utilizationPercent >= 75) {
    return "approaching";
  }
  return "healthy";
}

export function calculateMonthSnapshot(
  config: ProjectConfig,
  hoursUsed: number,
  priorRemaining: number,
): Omit<MonthSnapshot, "year" | "month"> {
  const used = roundHours(Math.max(hoursUsed, 0));

  if (!isManagedService(config.type)) {
    return {
      hoursUsed: used,
      carryoverUsed: null,
      hoursAvailable: null,
      hoursRemaining: null,
      hoursForNextMonth: null,
      utilizationPercent: null,
      status: "not_applicable",
    };
  }

  const monthlyHours = config.monthlyHours ?? 0;
  const maximumCarryoverHours = config.maximumCarryoverHours ?? monthlyHours;
  const carryoverUsed = calculateCarryoverUsed(priorRemaining, maximumCarryoverHours);
  const hoursAvailable = calculateHoursAvailable(monthlyHours, carryoverUsed);
  const hoursRemaining = calculateHoursRemaining(hoursAvailable, used);
  const hoursForNextMonth = calculateNextMonthHours(hoursRemaining, monthlyHours);
  const utilizationPercent = calculateUtilizationPercent(used, hoursAvailable);

  return {
    hoursUsed: used,
    carryoverUsed,
    hoursAvailable,
    hoursRemaining,
    hoursForNextMonth,
    utilizationPercent,
    status: getUtilizationStatus(utilizationPercent),
  };
}

function entryMap(entries: TimeEntryInput[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const entry of entries) {
    map.set(monthKey(entry.year, entry.month), roundHours(entry.hoursUsed));
  }
  return map;
}

function chainStartKey(config: ProjectConfig): number {
  return monthKey(config.startYear, config.startMonth);
}

export function isOnOrAfterProjectStart(
  config: Pick<ProjectConfig, "startYear" | "startMonth">,
  year: number,
  month: number,
): boolean {
  return monthKey(year, month) >= monthKey(config.startYear, config.startMonth);
}

/**
 * Walks month-by-month from the project start through the target month
 * so historical edits correctly recompute later available hours.
 * Opening carryover is applied to the first month (the project start month).
 */
export function calculateForMonth(
  config: ProjectConfig,
  entries: TimeEntryInput[],
  targetYear: number,
  targetMonth: number,
): MonthSnapshot {
  const usedLookup = entryMap(entries);
  const target = monthKey(targetYear, targetMonth);
  const start = chainStartKey(config);

  if (target < start) {
    const hoursUsed = usedLookup.get(target) ?? 0;
    return {
      year: targetYear,
      month: targetMonth,
      ...calculateMonthSnapshot(config, hoursUsed, 0),
    };
  }

  let priorRemaining = config.openingCarryoverHours ?? 0;
  let snapshot: MonthSnapshot | null = null;

  for (let key = start; key <= target; key += 1) {
    const { year, month } = fromMonthKey(key);
    const hoursUsed = usedLookup.get(key) ?? 0;
    const calc = calculateMonthSnapshot(config, hoursUsed, priorRemaining);
    snapshot = { year, month, ...calc };
    priorRemaining = calc.hoursRemaining ?? 0;
  }

  return snapshot as MonthSnapshot;
}

export function calculateRange(
  config: ProjectConfig,
  entries: TimeEntryInput[],
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
): MonthSnapshot[] {
  const rangeStart = monthKey(startYear, startMonth);
  const end = monthKey(endYear, endMonth);
  const start = Math.max(rangeStart, chainStartKey(config));
  const results: MonthSnapshot[] = [];
  for (let key = start; key <= end; key += 1) {
    const { year, month } = fromMonthKey(key);
    results.push(calculateForMonth(config, entries, year, month));
  }
  return results;
}

export function projectConfigFromRecord(project: {
  type: string;
  monthlyHours: number | null;
  maximumCarryoverHours: number | null;
  openingCarryoverHours?: number | null;
  startYear?: number | null;
  startMonth?: number | null;
  createdAt: Date;
}): ProjectConfig {
  return {
    type: project.type as ProjectType,
    monthlyHours: project.monthlyHours,
    maximumCarryoverHours: project.maximumCarryoverHours,
    openingCarryoverHours: project.openingCarryoverHours ?? null,
    startYear: project.startYear ?? project.createdAt.getFullYear(),
    startMonth: project.startMonth ?? project.createdAt.getMonth() + 1,
  };
}
