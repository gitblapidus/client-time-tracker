import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { inheritedCapitalRates } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { normalizeProductionManagerName } from "@/lib/production-managers";
import { parseBurnStatus, type BurnStatus } from "@/lib/burn-rate";
import type { ProjectInput } from "@/lib/validations";

async function resolveProductionManager(name: string | null | undefined) {
  const normalized = normalizeProductionManagerName(name);
  if (!normalized) {
    return null;
  }
  const existing = await prisma.productionManager.findMany({ select: { name: true } });
  const match = existing.find((row) => row.name.toLowerCase() === normalized.toLowerCase());
  if (match) {
    return match.name;
  }
  const created = await prisma.productionManager.create({ data: { name: normalized } });
  return created.name;
}

async function projectData(input: ProjectInput) {
  const isManaged = input.type === "MANAGED_SERVICE";
  const isCapital = input.type === "CAPITAL_TIME_AND_MATERIALS";
  const clientDefaults = isCapital
    ? inheritedCapitalRates(
        await prisma.client.findUnique({
          where: { id: input.clientId },
          select: { currency: true, devRate: true, pmRate: true },
        }),
      )
    : null;
  return {
    clientId: input.clientId,
    name: input.name,
    type: input.type,
    monthlyHours: isManaged ? input.monthlyHours ?? 0 : null,
    maximumCarryoverHours: isManaged
      ? (input.maximumCarryoverHours ?? input.monthlyHours ?? 0)
      : null,
    openingCarryoverHours: isManaged ? input.openingCarryoverHours ?? 0 : null,
    startYear: input.startYear,
    startMonth: input.startMonth,
    estimatedDevHours: isCapital ? input.estimatedDevHours ?? 0 : null,
    currency: isCapital ? input.currency ?? clientDefaults?.currency ?? "USD" : null,
    devRate: isCapital ? input.devRate ?? clientDefaults?.devRate ?? 0 : null,
    estimatedPmHours: isCapital ? input.estimatedPmHours ?? 0 : null,
    pmRate: isCapital ? input.pmRate ?? clientDefaults?.pmRate ?? 0 : null,
    productionManager: await resolveProductionManager(input.productionManager),
    active: input.active,
  };
}

export async function listProductionManagerNames() {
  const rows = await prisma.productionManager.findMany({
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((row) => row.name);
}

export async function listAssignedProductionManagerNames() {
  const rows = await prisma.project.findMany({
    where: { productionManager: { not: null } },
    distinct: ["productionManager"],
    select: { productionManager: true },
    orderBy: { productionManager: "asc" },
  });
  return rows
    .map((row) => row.productionManager)
    .filter((name): name is string => Boolean(name));
}

export async function listProjects(options?: {
  search?: string;
  active?: boolean;
  types?: string[];
  clientIds?: string[];
  productionManagers?: string[];
}) {
  const filters: object[] = [];
  if (options?.active !== undefined) {
    filters.push({ active: options.active });
    if (options.active) {
      filters.push({ client: { active: true } });
    }
  }
  if (options?.types?.length) {
    filters.push({ type: { in: options.types } });
  }
  if (options?.clientIds?.length) {
    filters.push({ clientId: { in: options.clientIds } });
  }
  if (options?.productionManagers?.length) {
    const names = options.productionManagers.filter((name) => name !== "unassigned");
    const unassigned = options.productionManagers.includes("unassigned");
    if (unassigned && names.length) {
      filters.push({ OR: [{ productionManager: null }, { productionManager: { in: names } }] });
    } else if (unassigned) {
      filters.push({ productionManager: null });
    } else {
      filters.push({ productionManager: { in: names } });
    }
  }
  if (options?.search) {
    filters.push({
      OR: [
        { name: { contains: options.search } },
        { client: { name: { contains: options.search } } },
        { productionManager: { contains: options.search } },
      ],
    });
  }
  return prisma.project.findMany({
    where: filters.length ? { AND: filters } : {},
    include: { client: true },
    orderBy: [{ client: { name: "asc" } }, { name: "asc" }],
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!project) {
    throw new NotFoundError("Project not found.");
  }
  return project;
}

async function assertClientAllowsActiveProject(clientId: string, active: boolean) {
  if (!active) return;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { active: true } });
  if (!client) {
    throw new NotFoundError("Client not found.");
  }
  if (!client.active) {
    throw new AppError("Activate the client before activating this project.", 400, "CLIENT_INACTIVE");
  }
}

export async function createProject(input: ProjectInput) {
  const duplicate = await prisma.project.findFirst({
    where: { clientId: input.clientId, name: { equals: input.name } },
  });
  if (duplicate) {
    throw new ConflictError("A project with this name already exists for this client.");
  }
  await assertClientAllowsActiveProject(input.clientId, input.active);
  return prisma.project.create({
    data: await projectData(input),
    include: { client: true },
  });
}

export async function updateProject(id: string, input: ProjectInput) {
  await getProject(id);
  await assertClientAllowsActiveProject(input.clientId, input.active);
  const duplicate = await prisma.project.findFirst({
    where: {
      clientId: input.clientId,
      name: { equals: input.name },
      NOT: { id },
    },
  });
  if (duplicate) {
    throw new ConflictError("A project with this name already exists for this client.");
  }
  return prisma.project.update({
    where: { id },
    data: await projectData(input),
    include: { client: true },
  });
}

export async function setProjectBurnStatus(id: string, status: BurnStatus) {
  await getProject(id);
  return prisma.project.update({
    where: { id },
    data: { burnStatus: parseBurnStatus(status) },
    include: { client: true },
  });
}

export async function setProjectActive(id: string, active: boolean) {
  const project = await getProject(id);
  await assertClientAllowsActiveProject(project.clientId, active);
  return prisma.project.update({
    where: { id },
    data: { active },
    include: { client: true },
  });
}
