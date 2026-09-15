import { isManagedService, roundHours } from "@/lib/calculations";

export type SplitHoursInput = {
  hoursUsed: number;
  developmentHours?: number | null;
  pmHours?: number | null;
};

export type TmHours = {
  developmentHours: number;
  pmHours: number;
  hoursUsed: number;
};

export function totalTmHours(developmentHours: number, pmHours: number): number {
  return roundHours(developmentHours + pmHours);
}

/** Resolve T&M splits. Legacy rows with only hoursUsed show that value as development hours. */
export function resolveTmHours(entry?: SplitHoursInput | null): TmHours {
  if (!entry) {
    return { developmentHours: 0, pmHours: 0, hoursUsed: 0 };
  }
  const hasSplit = entry.developmentHours != null || entry.pmHours != null;
  if (!hasSplit) {
    return {
      developmentHours: entry.hoursUsed,
      pmHours: 0,
      hoursUsed: entry.hoursUsed,
    };
  }
  const developmentHours = entry.developmentHours ?? 0;
  const pmHours = entry.pmHours ?? 0;
  return {
    developmentHours,
    pmHours,
    hoursUsed: totalTmHours(developmentHours, pmHours),
  };
}

export function partitionByProjectType<T extends { projectType?: string; type?: string }>(rows: T[]) {
  const managed: T[] = [];
  const timeAndMaterials: T[] = [];
  for (const row of rows) {
    if (isManagedService(row.projectType ?? row.type ?? "")) {
      managed.push(row);
    } else {
      timeAndMaterials.push(row);
    }
  }
  return { managed, timeAndMaterials };
}
