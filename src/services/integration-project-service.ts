import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { normalizeProductionManagerName } from "@/lib/production-managers";
import type { IntegrationProjectInput } from "@/lib/validations";

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

export async function getIntegrationProject(id: string) {
  const project = await prisma.integrationProject.findUnique({
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
  const client = await prisma.integrationClient.findUnique({ where: { id: clientId }, select: { active: true } });
  if (!client) {
    throw new NotFoundError("Client not found.");
  }
  if (!client.active) {
    throw new AppError("Activate the client before activating this project.", 400, "CLIENT_INACTIVE");
  }
}

async function findProjectByName(clientId: string, name: string, excludeId?: string) {
  const projects = await prisma.integrationProject.findMany({
    where: { clientId },
    select: { id: true, name: true },
  });
  return projects.find(
    (project) => project.name.toLowerCase() === name.toLowerCase() && project.id !== excludeId,
  );
}

export async function createIntegrationProject(input: IntegrationProjectInput) {
  const duplicate = await findProjectByName(input.clientId, input.name);
  if (duplicate) {
    throw new ConflictError("A project with this name already exists for this client.");
  }
  await assertClientAllowsActiveProject(input.clientId, input.active);
  return prisma.integrationProject.create({
    data: {
      clientId: input.clientId,
      name: input.name,
      productionManager: await resolveProductionManager(input.productionManager),
      active: input.active,
    },
    include: { client: true },
  });
}

export async function updateIntegrationProject(id: string, input: IntegrationProjectInput) {
  await getIntegrationProject(id);
  await assertClientAllowsActiveProject(input.clientId, input.active);
  const duplicate = await findProjectByName(input.clientId, input.name, id);
  if (duplicate) {
    throw new ConflictError("A project with this name already exists for this client.");
  }
  return prisma.integrationProject.update({
    where: { id },
    data: {
      clientId: input.clientId,
      name: input.name,
      productionManager: await resolveProductionManager(input.productionManager),
      active: input.active,
    },
    include: { client: true },
  });
}

export async function setIntegrationProjectActive(id: string, active: boolean) {
  const project = await getIntegrationProject(id);
  await assertClientAllowsActiveProject(project.clientId, active);
  return prisma.integrationProject.update({
    where: { id },
    data: { active },
    include: { client: true },
  });
}
