import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { IntegrationClientInput } from "@/lib/validations";

export async function listIntegrationClients(options?: { search?: string; active?: boolean }) {
  return prisma.integrationClient.findMany({
    where: {
      ...(options?.active === undefined ? {} : { active: options.active }),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { executiveName: { contains: options.search } },
              { executiveEmail: { contains: options.search } },
              { executivePhone: { contains: options.search } },
              { spocName: { contains: options.search } },
              { spocEmail: { contains: options.search } },
              { spocPhone: { contains: options.search } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { projects: true } },
      projects: {
        select: { id: true, name: true, productionManager: true, active: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getIntegrationClient(id: string) {
  const client = await prisma.integrationClient.findUnique({
    where: { id },
    include: {
      projects: { orderBy: { name: "asc" } },
    },
  });
  if (!client) {
    throw new NotFoundError("Client not found.");
  }
  return client;
}

async function findClientByName(name: string, excludeId?: string) {
  const clients = await prisma.integrationClient.findMany({ select: { id: true, name: true } });
  return clients.find(
    (client) => client.name.toLowerCase() === name.toLowerCase() && client.id !== excludeId,
  );
}

export async function createIntegrationClient(input: IntegrationClientInput) {
  const existing = await findClientByName(input.name);
  if (existing) {
    throw new ConflictError("A client with this name already exists.");
  }
  return prisma.integrationClient.create({
    data: {
      name: input.name,
      active: input.active,
      executiveName: input.executiveName,
      executiveEmail: input.executiveEmail,
      executivePhone: input.executivePhone,
      spocName: input.spocName,
      spocEmail: input.spocEmail,
      spocPhone: input.spocPhone,
    },
  });
}

export async function updateIntegrationClient(id: string, input: IntegrationClientInput) {
  await getIntegrationClient(id);
  const duplicate = await findClientByName(input.name, id);
  if (duplicate) {
    throw new ConflictError("A client with this name already exists.");
  }
  return prisma.$transaction(async (tx) => {
    if (!input.active) {
      await tx.integrationProject.updateMany({
        where: { clientId: id, active: true },
        data: { active: false },
      });
    }
    return tx.integrationClient.update({
      where: { id },
      data: {
        name: input.name,
        active: input.active,
        executiveName: input.executiveName,
        executiveEmail: input.executiveEmail,
        executivePhone: input.executivePhone,
        spocName: input.spocName,
        spocEmail: input.spocEmail,
        spocPhone: input.spocPhone,
      },
    });
  });
}

export async function setIntegrationClientActive(id: string, active: boolean) {
  await getIntegrationClient(id);
  return prisma.$transaction(async (tx) => {
    if (!active) {
      await tx.integrationProject.updateMany({
        where: { clientId: id, active: true },
        data: { active: false },
      });
    }
    return tx.integrationClient.update({
      where: { id },
      data: { active },
    });
  });
}

export async function deleteIntegrationClient(id: string) {
  await getIntegrationClient(id);
  await prisma.$transaction(async (tx) => {
    await tx.integrationProject.deleteMany({ where: { clientId: id } });
    await tx.integrationClient.delete({ where: { id } });
  });
}
