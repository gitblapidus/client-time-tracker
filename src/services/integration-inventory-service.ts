import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { normalizeReferenceId } from "@/lib/integration-inventory";
import { prisma } from "@/lib/prisma";
import { normalizeProductionManagerName } from "@/lib/production-managers";
import type { IntegrationInventoryInput } from "@/lib/validations";
import { listProductionManagerNames } from "@/services/project-service";

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function requireReferenceId(value: string | null | undefined) {
  const referenceId = normalizeReferenceId(value);
  if (!referenceId) {
    throw new AppError("Reference ID must start with INT-.");
  }
  return referenceId;
}

async function assertUniqueReferenceId(referenceId: string, excludeId?: string) {
  const existing = await prisma.integrationInventory.findUnique({ where: { referenceId } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("A record with this Reference ID already exists.");
  }
}

function inventoryData(input: IntegrationInventoryInput, referenceId: string) {
  return {
    referenceId,
    name: input.name,
    description: input.description,
    mvp: input.mvp,
    type: input.type,
    direction: input.direction,
    mode: input.mode,
    format: input.format,
    dataSource: input.dataSource,
    dataTarget: input.dataTarget,
    responsible: normalizeProductionManagerName(input.responsible),
    pillar: normalizeProductionManagerName(input.pillar),
  };
}

export async function listIntegrationInventory(options?: {
  search?: string;
  mvp?: boolean;
  type?: string[];
  direction?: string[];
  mode?: string[];
  format?: string[];
}) {
  const items = await prisma.integrationInventory.findMany({
    where: {
      ...(options?.mvp === undefined ? {} : { mvp: options.mvp }),
      ...(options?.type?.length ? { type: { in: options.type } } : {}),
      ...(options?.direction?.length ? { direction: { in: options.direction } } : {}),
      ...(options?.mode?.length ? { mode: { in: options.mode } } : {}),
      ...(options?.format?.length ? { format: { in: options.format } } : {}),
      ...(options?.search
        ? {
            OR: [
              { referenceId: { contains: options.search } },
              { name: { contains: options.search } },
              { description: { contains: options.search } },
              { dataSource: { contains: options.search } },
              { dataTarget: { contains: options.search } },
              { responsible: { contains: options.search } },
              { pillar: { contains: options.search } },
            ],
          }
        : {}),
    },
    orderBy: { referenceId: "asc" },
  });
  const optionLists = await listIntegrationInventoryOptions();
  return {
    items,
    options: optionLists,
  };
}

export async function listIntegrationInventoryOptions() {
  const [rows, productionManagers] = await Promise.all([
    prisma.integrationInventory.findMany({
      select: { responsible: true, pillar: true },
    }),
    listProductionManagerNames(),
  ]);
  return {
    responsibles: uniqueSorted([...productionManagers, ...rows.map((row) => row.responsible)]),
    pillars: uniqueSorted(rows.map((row) => row.pillar)),
  };
}

export async function getIntegrationInventory(id: string) {
  const item = await prisma.integrationInventory.findUnique({ where: { id } });
  if (!item) {
    throw new NotFoundError("Integration not found.");
  }
  return item;
}

export async function createIntegrationInventory(input: IntegrationInventoryInput) {
  const referenceId = requireReferenceId(input.referenceId);
  await assertUniqueReferenceId(referenceId);
  return prisma.integrationInventory.create({
    data: inventoryData(input, referenceId),
  });
}

export async function updateIntegrationInventory(id: string, input: IntegrationInventoryInput) {
  await getIntegrationInventory(id);
  const referenceId = requireReferenceId(input.referenceId);
  await assertUniqueReferenceId(referenceId, id);
  return prisma.integrationInventory.update({
    where: { id },
    data: inventoryData(input, referenceId),
  });
}

export async function deleteIntegrationInventory(id: string) {
  await getIntegrationInventory(id);
  await prisma.integrationInventory.delete({ where: { id } });
}
