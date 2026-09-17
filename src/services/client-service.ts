import { ConflictError, NotFoundError } from "@/lib/errors";
import { parseFinanceEmails, serializeFinanceEmails } from "@/lib/finance-emails";
import { prisma } from "@/lib/prisma";
import type { ClientInput } from "@/lib/validations";

function withFinanceEmails<T extends { financeEmail: string | null }>(client: T) {
  return {
    ...client,
    financeEmails: parseFinanceEmails(client.financeEmail),
  };
}

export async function listClients(options?: { search?: string; active?: boolean }) {
  return prisma.client.findMany({
    where: {
      ...(options?.active === undefined ? {} : { active: options.active }),
      ...(options?.search
        ? {
            OR: [
              { name: { contains: options.search } },
              { financeEmail: { contains: options.search } },
              { executiveName: { contains: options.search } },
              { executiveEmail: { contains: options.search } },
              { spocName: { contains: options.search } },
              { spocEmail: { contains: options.search } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { projects: true } },
      projects: {
        select: { id: true, name: true, type: true, active: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  }).then((clients) => clients.map(withFinanceEmails));
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: { orderBy: { name: "asc" } },
    },
  });
  if (!client) {
    throw new NotFoundError("Client not found.");
  }
  return withFinanceEmails(client);
}

async function findClientByName(name: string, excludeId?: string) {
  const clients = await prisma.client.findMany({ select: { id: true, name: true } });
  return clients.find(
    (client) => client.name.toLowerCase() === name.toLowerCase() && client.id !== excludeId,
  );
}

export async function createClient(input: ClientInput) {
  const existing = await findClientByName(input.name);
  if (existing) {
    throw new ConflictError("A client with this name already exists.");
  }
  return withFinanceEmails(
    await prisma.client.create({
      data: {
        name: input.name,
        active: input.active,
        financeEmail: serializeFinanceEmails(input.financeEmails),
        executiveName: input.executiveName,
        executiveEmail: input.executiveEmail,
        spocName: input.spocName,
        spocEmail: input.spocEmail,
        currency: input.currency,
        devRate: input.devRate,
        pmRate: input.pmRate,
      },
    }),
  );
}

export async function updateClient(id: string, input: ClientInput) {
  await getClient(id);
  const duplicate = await findClientByName(input.name, id);
  if (duplicate) {
    throw new ConflictError("A client with this name already exists.");
  }
  const client = await prisma.$transaction(async (tx) => {
    if (!input.active) {
      await tx.project.updateMany({
        where: { clientId: id, active: true },
        data: { active: false },
      });
    }
    return tx.client.update({
      where: { id },
      data: {
        name: input.name,
        active: input.active,
        financeEmail: serializeFinanceEmails(input.financeEmails),
        executiveName: input.executiveName,
        executiveEmail: input.executiveEmail,
        spocName: input.spocName,
        spocEmail: input.spocEmail,
        currency: input.currency,
        devRate: input.devRate,
        pmRate: input.pmRate,
      },
    });
  });
  return withFinanceEmails(client);
}

export async function setClientActive(id: string, active: boolean) {
  await getClient(id);
  const client = await prisma.$transaction(async (tx) => {
    if (!active) {
      await tx.project.updateMany({
        where: { clientId: id, active: true },
        data: { active: false },
      });
    }
    return tx.client.update({
      where: { id },
      data: { active },
    });
  });
  return withFinanceEmails(client);
}

export async function deleteClient(id: string) {
  await getClient(id);
  await prisma.$transaction(async (tx) => {
    const projects = await tx.project.findMany({
      where: { clientId: id },
      select: { id: true },
    });
    const projectIds = projects.map((project) => project.id);
    if (projectIds.length > 0) {
      await tx.timeEntry.deleteMany({ where: { projectId: { in: projectIds } } });
      await tx.project.deleteMany({ where: { clientId: id } });
    }
    await tx.client.delete({ where: { id } });
  });
}
