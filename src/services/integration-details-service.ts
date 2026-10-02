import { prisma } from "@/lib/prisma";
import type { IntegrationDetailsInput } from "@/lib/validations";
import { getIntegrationInventory } from "@/services/integration-inventory-service";

export type IntegrationDetailsFields = {
  overview: string | null;
  assumptions: string[];
  source: string | null;
  target: string | null;
  interfaceType: string | null;
  interfaceFormat: string | null;
  dataDependencies: string | null;
  jobDependencies: string | null;
  frequency: string | null;
  scheduledMechanism: string | null;
  performanceConsiderations: string | null;
  interfaceTimeoutValue: string | null;
  expectedDataVolume: string | null;
  solutionApproach: string | null;
};

function parseAssumptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function detailsFromInventory(item: {
  dataSource: string | null;
  dataTarget: string | null;
  format: string;
}): IntegrationDetailsFields {
  return {
    overview: null,
    assumptions: [],
    source: item.dataSource,
    target: item.dataTarget,
    interfaceType: null,
    interfaceFormat: item.format,
    dataDependencies: null,
    jobDependencies: null,
    frequency: null,
    scheduledMechanism: null,
    performanceConsiderations: null,
    interfaceTimeoutValue: null,
    expectedDataVolume: null,
    solutionApproach: null,
  };
}

function mapDetailsRecord(record: {
  overview: string | null;
  assumptions: unknown;
  source: string | null;
  target: string | null;
  interfaceType: string | null;
  interfaceFormat: string | null;
  dataDependencies: string | null;
  jobDependencies: string | null;
  frequency: string | null;
  scheduledMechanism: string | null;
  performanceConsiderations: string | null;
  interfaceTimeoutValue: string | null;
  expectedDataVolume: string | null;
  solutionApproach: string | null;
}): IntegrationDetailsFields {
  return {
    overview: record.overview,
    assumptions: parseAssumptions(record.assumptions),
    source: record.source,
    target: record.target,
    interfaceType: record.interfaceType,
    interfaceFormat: record.interfaceFormat,
    dataDependencies: record.dataDependencies,
    jobDependencies: record.jobDependencies,
    frequency: record.frequency,
    scheduledMechanism: record.scheduledMechanism,
    performanceConsiderations: record.performanceConsiderations,
    interfaceTimeoutValue: record.interfaceTimeoutValue,
    expectedDataVolume: record.expectedDataVolume,
    solutionApproach: record.solutionApproach,
  };
}

export async function getIntegrationDetails(inventoryId: string) {
  const inventory = await getIntegrationInventory(inventoryId);
  const record = await prisma.integrationDetails.findUnique({ where: { inventoryId } });
  return {
    inventory: {
      id: inventory.id,
      referenceId: inventory.referenceId,
      name: inventory.name,
    },
    details: record ? mapDetailsRecord(record) : detailsFromInventory(inventory),
    saved: Boolean(record),
  };
}

export async function upsertIntegrationDetails(inventoryId: string, input: IntegrationDetailsInput) {
  await getIntegrationInventory(inventoryId);
  const data = {
    overview: input.overview ?? null,
    assumptions: input.assumptions,
    source: input.source ?? null,
    target: input.target ?? null,
    interfaceType: input.interfaceType,
    interfaceFormat: input.interfaceFormat ?? null,
    dataDependencies: input.dataDependencies ?? null,
    jobDependencies: input.jobDependencies ?? null,
    frequency: input.frequency ?? null,
    scheduledMechanism: input.scheduledMechanism ?? null,
    performanceConsiderations: input.performanceConsiderations ?? null,
    interfaceTimeoutValue: input.interfaceTimeoutValue ?? null,
    expectedDataVolume: input.expectedDataVolume ?? null,
    solutionApproach: input.solutionApproach ?? null,
  };
  const record = await prisma.integrationDetails.upsert({
    where: { inventoryId },
    create: { inventoryId, ...data },
    update: data,
  });
  return mapDetailsRecord(record);
}
