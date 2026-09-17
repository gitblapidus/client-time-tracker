import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  addMonths,
  calculateForMonth,
  calculateRange,
  inheritedCapitalRates,
  isManagedService,
  isOnOrAfterProjectStart,
  isTimeTrackedProject,
  monthKey,
  projectConfigFromRecord,
  TRACKED_PROJECT_TYPES,
  type MonthSnapshot,
} from "@/lib/calculations";
import { buildBurnProject, buildBurnTotals, sortBurnProjects } from "@/lib/burn-rate";
import { resolveTmHours } from "@/lib/time-hours";
import type { TimeEntryBulkInput } from "@/lib/validations";

type EntryHours = {
  year: number;
  month: number;
  hoursUsed: number;
  developmentHours: number | null;
  pmHours: number | null;
};

function monthHours(entries: EntryHours[], year: number, month: number) {
  return entries.find((entry) => entry.year === year && entry.month === month);
}

function toCalcEntries(projectType: string, entries: EntryHours[]) {
  return entries.map((entry) => {
    if (isManagedService(projectType)) {
      return { year: entry.year, month: entry.month, hoursUsed: entry.hoursUsed };
    }
    const split = resolveTmHours(entry);
    return { year: entry.year, month: entry.month, hoursUsed: split.hoursUsed };
  });
}

function withSplitHours(
  projectType: string,
  snapshot: MonthSnapshot,
  entry: EntryHours | undefined,
) {
  if (isManagedService(projectType)) {
    return {
      ...snapshot,
      developmentHours: null as number | null,
      pmHours: null as number | null,
    };
  }
  const split = resolveTmHours(entry);
  return {
    ...snapshot,
    hoursUsed: split.hoursUsed,
    developmentHours: split.developmentHours,
    pmHours: split.pmHours,
  };
}

export async function getProjectEntries(projectId: string) {
  return prisma.timeEntry.findMany({
    where: { projectId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
}

export async function snapshotForProject(
  project: {
    id: string;
    type: string;
    monthlyHours: number | null;
    maximumCarryoverHours: number | null;
    openingCarryoverHours?: number | null;
    startYear?: number | null;
    startMonth?: number | null;
    createdAt: Date;
  },
  year: number,
  month: number,
): Promise<MonthSnapshot> {
  const entries = await getProjectEntries(project.id);
  return calculateForMonth(
    projectConfigFromRecord(project),
    toCalcEntries(project.type, entries),
    year,
    month,
  );
}

export async function listTimeEntryRows(year: number, month: number) {
  const projects = await prisma.project.findMany({
    where: { active: true, client: { active: true }, type: { in: [...TRACKED_PROJECT_TYPES] } },
    include: {
      client: true,
      timeEntries: true,
    },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  return projects
    .filter((project) => isOnOrAfterProjectStart(projectConfigFromRecord(project), year, month))
    .map((project) => {
    const snapshot = calculateForMonth(
      projectConfigFromRecord(project),
      toCalcEntries(project.type, project.timeEntries),
      year,
      month,
    );
    return {
      projectId: project.id,
      clientId: project.clientId,
      clientName: project.client.name,
      projectName: project.name,
      productionManager: project.productionManager,
      projectType: project.type,
      monthlyHours: project.monthlyHours,
      maximumCarryoverHours: project.maximumCarryoverHours,
      ...withSplitHours(project.type, snapshot, monthHours(project.timeEntries, year, month)),
    };
  });
}

export async function saveTimeEntries(userId: string, input: TimeEntryBulkInput) {
  const projects = await prisma.project.findMany({
    where: { id: { in: input.entries.map((entry) => entry.projectId) } },
    select: {
      id: true,
      type: true,
      monthlyHours: true,
      maximumCarryoverHours: true,
      openingCarryoverHours: true,
      startYear: true,
      startMonth: true,
      createdAt: true,
    },
  });
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const results = [];
  for (const entry of input.entries) {
    const project = projectById.get(entry.projectId);
    if (!project) {
      throw new Error("One or more projects could not be found.");
    }
    if (!isOnOrAfterProjectStart(projectConfigFromRecord(project), input.year, input.month)) {
      throw new AppError(
        "Time cannot be entered for a project before its start month.",
        400,
        "PROJECT_NOT_STARTED",
      );
    }
    if (!isTimeTrackedProject(project.type)) {
      throw new AppError("Time cannot be entered for this project type.", 400, "PROJECT_NOT_TRACKED");
    }
    const projectType = project.type;

    let hoursUsed: number;
    let developmentHours: number | null = null;
    let pmHours: number | null = null;

    if (isManagedService(projectType)) {
      hoursUsed = entry.hoursUsed ?? 0;
    } else if (entry.developmentHours != null || entry.pmHours != null) {
      const split = resolveTmHours({
        hoursUsed: 0,
        developmentHours: entry.developmentHours ?? 0,
        pmHours: entry.pmHours ?? 0,
      });
      developmentHours = split.developmentHours;
      pmHours = split.pmHours;
      hoursUsed = split.hoursUsed;
    } else {
      const split = resolveTmHours({ hoursUsed: entry.hoursUsed ?? 0 });
      developmentHours = split.developmentHours;
      pmHours = split.pmHours;
      hoursUsed = split.hoursUsed;
    }

    const saved = await prisma.timeEntry.upsert({
      where: {
        projectId_month_year: {
          projectId: entry.projectId,
          month: input.month,
          year: input.year,
        },
      },
      create: {
        projectId: entry.projectId,
        month: input.month,
        year: input.year,
        hoursUsed,
        developmentHours,
        pmHours,
        createdById: userId,
        updatedById: userId,
      },
      update: {
        hoursUsed,
        developmentHours,
        pmHours,
        updatedById: userId,
      },
    });
    results.push(saved);
  }
  return results;
}

function reportProjectWhere(
  params: {
    clientIds?: string[];
    projectIds?: string[];
    productionManagers?: string[];
  },
  types: string[],
) {
  const managerFilter = params.productionManagers ?? [];
  const managerNames = managerFilter.filter((name) => name !== "unassigned");
  const includeUnassigned = managerFilter.includes("unassigned");
  return {
    active: true,
    client: { active: true },
    type: { in: types },
    ...(params.clientIds?.length ? { clientId: { in: params.clientIds } } : {}),
    ...(params.projectIds?.length ? { id: { in: params.projectIds } } : {}),
    ...(managerFilter.length
      ? includeUnassigned && managerNames.length
        ? { OR: [{ productionManager: null }, { productionManager: { in: managerNames } }] }
        : includeUnassigned
          ? { productionManager: null }
          : { productionManager: { in: managerNames } }
      : {}),
  };
}

export async function buildReport(params: {
  clientIds?: string[];
  projectIds?: string[];
  productionManagers?: string[];
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}) {
  const projects = await prisma.project.findMany({
    where: reportProjectWhere(params, [...TRACKED_PROJECT_TYPES]),
    include: { client: true, timeEntries: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  const rows = projects.flatMap((project) => {
    const snapshots = calculateRange(
      projectConfigFromRecord(project),
      toCalcEntries(project.type, project.timeEntries),
      params.startYear,
      params.startMonth,
      params.endYear,
      params.endMonth,
    );
    return snapshots.map((snapshot) => ({
      clientId: project.clientId,
      clientName: project.client.name,
      projectId: project.id,
      projectName: project.name,
      productionManager: project.productionManager,
      projectType: project.type,
      monthlyHours: project.monthlyHours,
      ...withSplitHours(project.type, snapshot, monthHours(project.timeEntries, snapshot.year, snapshot.month)),
    }));
  });

  const managed = rows.filter((row) => isManagedService(row.projectType));
  const totalAvailable = managed.reduce((sum, row) => sum + (row.hoursAvailable ?? 0), 0);
  const totalUsed = rows.reduce((sum, row) => sum + row.hoursUsed, 0);
  const totalRemaining = managed.reduce((sum, row) => sum + (row.hoursRemaining ?? 0), 0);
  const monthCount = new Set(rows.map((row) => `${row.year}-${row.month}`)).size || 1;

  return {
    rows,
    summary: {
      totalAvailableHours: totalAvailable,
      totalUsedHours: totalUsed,
      totalRemainingHours: totalRemaining,
      averageMonthlyUsage: totalUsed / monthCount,
      utilizationPercent: totalAvailable > 0 ? (totalUsed / totalAvailable) * 100 : 0,
    },
  };
}

export async function buildBurnRateReport(params: {
  clientIds?: string[];
  projectIds?: string[];
  productionManagers?: string[];
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}) {
  const startKey = monthKey(params.startYear, params.startMonth);
  const endKey = monthKey(params.endYear, params.endMonth);
  const projects = await prisma.project.findMany({
    where: reportProjectWhere(params, ["CAPITAL_TIME_AND_MATERIALS"]),
    include: { client: true, timeEntries: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });

  const burnProjects = sortBurnProjects(
    projects
      .filter((project) => monthKey(project.startYear, project.startMonth) <= endKey)
      .map((project) => {
      const rates = inheritedCapitalRates({
        currency: project.currency ?? project.client.currency,
        devRate: project.devRate ?? project.client.devRate,
        pmRate: project.pmRate ?? project.client.pmRate,
      });
      const actuals = project.timeEntries.reduce(
        (sum, entry) => {
          const key = monthKey(entry.year, entry.month);
          if (key < startKey || key > endKey) return sum;
          if (!isOnOrAfterProjectStart(projectConfigFromRecord(project), entry.year, entry.month)) return sum;
          const split = resolveTmHours(entry);
          return {
            developmentHours: sum.developmentHours + split.developmentHours,
            pmHours: sum.pmHours + split.pmHours,
          };
        },
        { developmentHours: 0, pmHours: 0 },
      );
      return buildBurnProject({
        projectId: project.id,
        projectName: project.name,
        clientName: project.client.name,
        currency: rates.currency,
        productionManager: project.productionManager,
        estimatedPmHours: project.estimatedPmHours ?? 0,
        pmRate: rates.pmRate,
        estimatedDevHours: project.estimatedDevHours ?? 0,
        devRate: rates.devRate,
        actualPmHours: actuals.pmHours,
        actualDevHours: actuals.developmentHours,
        status: project.burnStatus,
      });
    }),
  );

  return {
    projects: burnProjects,
    totals: buildBurnTotals(burnProjects),
  };
}

export async function getDashboard(year: number, month: number) {
  const [clients, projects] = await Promise.all([
    prisma.client.findMany(),
    prisma.project.findMany({
      include: { client: true, timeEntries: true },
    }),
  ]);

  const activeClients = clients.filter((client) => client.active).length;
  const activeProjects = projects.filter((project) => project.active && isTimeTrackedProject(project.type)).length;
  const rows = projects
    .filter(
      (project) =>
        project.active &&
        project.client.active &&
        isTimeTrackedProject(project.type) &&
        isOnOrAfterProjectStart(projectConfigFromRecord(project), year, month),
    )
    .map((project) => {
      const snapshot = calculateForMonth(
        projectConfigFromRecord(project),
        toCalcEntries(project.type, project.timeEntries),
        year,
        month,
      );
      return {
        clientId: project.clientId,
        clientName: project.client.name,
        projectId: project.id,
        projectName: project.name,
        productionManager: project.productionManager,
        projectType: project.type,
        monthlyHours: project.monthlyHours,
        ...withSplitHours(project.type, snapshot, monthHours(project.timeEntries, year, month)),
      };
    });

  const managed = rows.filter((row) => isManagedService(row.projectType));
  const hoursUsed = rows.reduce((sum, row) => sum + row.hoursUsed, 0);
  const hoursRemaining = managed.reduce((sum, row) => sum + (row.hoursRemaining ?? 0), 0);
  const hoursAvailable = managed.reduce((sum, row) => sum + (row.hoursAvailable ?? 0), 0);
  const overAllocation = managed.filter((row) => (row.hoursRemaining ?? 0) < 0).length;
  const utilizationPercent = hoursAvailable > 0 ? (hoursUsed / hoursAvailable) * 100 : 0;
  const previous = addMonths(year, month, -1);
  const previousHoursUsed = projects
    .filter(
      (project) =>
        project.active &&
        project.client.active &&
        isTimeTrackedProject(project.type) &&
        isOnOrAfterProjectStart(projectConfigFromRecord(project), previous.year, previous.month),
    )
    .reduce((sum, project) => {
      const snapshot = calculateForMonth(
        projectConfigFromRecord(project),
        toCalcEntries(project.type, project.timeEntries),
        previous.year,
        previous.month,
      );
      return sum + snapshot.hoursUsed;
    }, 0);

  return {
    cards: {
      totalClients: activeClients,
      totalProjects: activeProjects,
      hoursUsed,
      previousHoursUsed,
      hoursRemaining,
      projectsOverAllocation: overAllocation,
      utilizationPercent,
    },
    rows,
  };
}
