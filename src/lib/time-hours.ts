import { isCapitalTimeAndMaterials, isManagedService, isSow, isTimeAndMaterials, roundHours } from "@/lib/calculations";

export type SplitHoursInput = {
  hoursUsed: number;
  developmentHours?: number | null;
  pmHours?: number | null;
  deliveryLeadHours?: number | null;
  technicalLeadershipHours?: number | null;
};

export type TmHours = {
  developmentHours: number;
  pmHours: number;
  hoursUsed: number;
};

export const SOW_HOUR_LINES = [
  { key: "developmentHours", quotedKey: "quotedDevelopmentHours", label: "Development" },
  { key: "deliveryLeadHours", quotedKey: "quotedDeliveryLeadHours", label: "Delivery Lead" },
  { key: "technicalLeadershipHours", quotedKey: "quotedTechnicalLeadershipHours", label: "Technical Leadership" },
] as const;

export type SowHours = {
  developmentHours: number;
  deliveryLeadHours: number;
  technicalLeadershipHours: number;
  hoursUsed: number;
};

export function totalTmHours(developmentHours: number, pmHours: number): number {
  return roundHours(developmentHours + pmHours);
}

export function totalSowHours(
  developmentHours: number,
  deliveryLeadHours: number,
  technicalLeadershipHours: number,
): number {
  return roundHours(developmentHours + deliveryLeadHours + technicalLeadershipHours);
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

/** Resolve SOW splits. Legacy rows with only hoursUsed show that value as Development. */
export function resolveSowHours(entry?: SplitHoursInput | null): SowHours {
  if (!entry) {
    return { developmentHours: 0, deliveryLeadHours: 0, technicalLeadershipHours: 0, hoursUsed: 0 };
  }
  const hasSplit =
    entry.developmentHours != null || entry.deliveryLeadHours != null || entry.technicalLeadershipHours != null;
  if (!hasSplit) {
    return {
      developmentHours: entry.hoursUsed,
      deliveryLeadHours: 0,
      technicalLeadershipHours: 0,
      hoursUsed: entry.hoursUsed,
    };
  }
  const developmentHours = entry.developmentHours ?? 0;
  const deliveryLeadHours = entry.deliveryLeadHours ?? 0;
  const technicalLeadershipHours = entry.technicalLeadershipHours ?? 0;
  return {
    developmentHours,
    deliveryLeadHours,
    technicalLeadershipHours,
    hoursUsed: totalSowHours(developmentHours, deliveryLeadHours, technicalLeadershipHours),
  };
}

export function partitionByProjectType<T extends { projectType?: string; type?: string }>(rows: T[]) {
  const managed: T[] = [];
  const timeAndMaterials: T[] = [];
  const capitalTimeAndMaterials: T[] = [];
  const sow: T[] = [];
  for (const row of rows) {
    const type = row.projectType ?? row.type ?? "";
    if (isManagedService(type)) {
      managed.push(row);
    } else if (isTimeAndMaterials(type)) {
      timeAndMaterials.push(row);
    } else if (isCapitalTimeAndMaterials(type)) {
      capitalTimeAndMaterials.push(row);
    } else if (isSow(type)) {
      sow.push(row);
    }
  }
  return { managed, timeAndMaterials, capitalTimeAndMaterials, sow };
}
