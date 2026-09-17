import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function d(year: number, month: number, day = 1) {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function startAt(year: number, month: number) {
  return {
    startYear: year,
    startMonth: month,
    createdAt: d(year, month),
  };
}

async function upsertEntries(
  projectId: string,
  adminId: string,
  entries: Array<{
    year: number;
    month: number;
    hoursUsed?: number;
    developmentHours?: number;
    pmHours?: number;
  }>,
) {
  for (const entry of entries) {
    const hasSplit = entry.developmentHours != null || entry.pmHours != null;
    const developmentHours = hasSplit ? (entry.developmentHours ?? 0) : null;
    const pmHours = hasSplit ? (entry.pmHours ?? 0) : null;
    const hoursUsed = hasSplit
      ? Math.round(((developmentHours ?? 0) + (pmHours ?? 0)) * 100) / 100
      : (entry.hoursUsed ?? 0);
    await prisma.timeEntry.upsert({
      where: {
        projectId_month_year: {
          projectId,
          month: entry.month,
          year: entry.year,
        },
      },
      update: { hoursUsed, developmentHours, pmHours, updatedById: adminId },
      create: {
        projectId,
        month: entry.month,
        year: entry.year,
        hoursUsed,
        developmentHours,
        pmHours,
        createdById: adminId,
        updatedById: adminId,
      },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);
  const analystHash = await bcrypt.hash("analyst123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash, name: "Alex Morgan", role: "ADMIN", active: true },
    create: {
      username: "admin",
      passwordHash,
      name: "Alex Morgan",
      role: "ADMIN",
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "analyst" },
    update: { passwordHash: analystHash, name: "Jordan Lee", role: "USER", active: true },
    create: {
      username: "analyst",
      passwordHash: analystHash,
      name: "Jordan Lee",
      role: "USER",
      active: true,
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {
      companyName: "DSS Partners",
      financeEmail: "finance@dsspartners.example",
      defaultMonthlyHours: 40,
      fiscalYearStartMonth: 1,
    },
    create: {
      id: "default",
      companyName: "DSS Partners",
      financeEmail: "finance@dsspartners.example",
      defaultMonthlyHours: 40,
      fiscalYearStartMonth: 1,
    },
  });

  const acme = await prisma.client.upsert({
    where: { name: "Acme Corporation" },
    update: {
      financeEmail: "finance@acme.example, ap@acme.example",
      executiveName: "Pat Rivera",
      executiveEmail: "pat.rivera@acme.example",
      spocName: "Casey Nguyen",
      spocEmail: "casey.nguyen@acme.example",
      active: true,
    },
    create: {
      name: "Acme Corporation",
      financeEmail: "finance@acme.example, ap@acme.example",
      executiveName: "Pat Rivera",
      executiveEmail: "pat.rivera@acme.example",
      spocName: "Casey Nguyen",
      spocEmail: "casey.nguyen@acme.example",
      active: true,
    },
  });

  const northwind = await prisma.client.upsert({
    where: { name: "Northwind Traders" },
    update: { financeEmail: "ap@northwind.example", active: true },
    create: {
      name: "Northwind Traders",
      financeEmail: "ap@northwind.example",
      active: true,
    },
  });

  const globex = await prisma.client.upsert({
    where: { name: "Globex Industries" },
    update: { financeEmail: "billing@globex.example, finance@globex.example", active: true },
    create: {
      name: "Globex Industries",
      financeEmail: "billing@globex.example, finance@globex.example",
      active: true,
    },
  });

  const initech = await prisma.client.upsert({
    where: { name: "Initech LLC" },
    update: { financeEmail: "finance@initech.example", active: false },
    create: {
      name: "Initech LLC",
      financeEmail: "finance@initech.example",
      active: false,
    },
  });

  for (const name of ["Morgan Blake", "Chris Diaz", "Sam Patel"]) {
    await prisma.productionManager.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const acmeSupport = await prisma.project.upsert({
    where: { clientId_name: { clientId: acme.id, name: "Application Support" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      productionManager: "Morgan Blake",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: acme.id,
      name: "Application Support",
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      productionManager: "Morgan Blake",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const acmeDev = await prisma.project.upsert({
    where: { clientId_name: { clientId: acme.id, name: "Development" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Chris Diaz",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: acme.id,
      name: "Development",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Chris Diaz",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const nwErp = await prisma.project.upsert({
    where: { clientId_name: { clientId: northwind.id, name: "ERP Support" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 20,
      maximumCarryoverHours: 20,
      productionManager: "Sam Patel",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: northwind.id,
      name: "ERP Support",
      type: "MANAGED_SERVICE",
      monthlyHours: 20,
      maximumCarryoverHours: 20,
      productionManager: "Sam Patel",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const nwIntegrations = await prisma.project.upsert({
    where: { clientId_name: { clientId: northwind.id, name: "Integrations" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Chris Diaz",
      active: true,
      ...startAt(2026, 2),
    },
    create: {
      clientId: northwind.id,
      name: "Integrations",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Chris Diaz",
      active: true,
      ...startAt(2026, 2),
    },
  });

  const globexCloud = await prisma.project.upsert({
    where: { clientId_name: { clientId: globex.id, name: "Cloud Operations" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 60,
      maximumCarryoverHours: 30,
      productionManager: "Morgan Blake",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: globex.id,
      name: "Cloud Operations",
      type: "MANAGED_SERVICE",
      monthlyHours: 60,
      maximumCarryoverHours: 30,
      productionManager: "Morgan Blake",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const globexSecurity = await prisma.project.upsert({
    where: { clientId_name: { clientId: globex.id, name: "Security Review" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Sam Patel",
      active: true,
      ...startAt(2026, 3),
    },
    create: {
      clientId: globex.id,
      name: "Security Review",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      productionManager: "Sam Patel",
      active: true,
      ...startAt(2026, 3),
    },
  });

  const initechLegacy = await prisma.project.upsert({
    where: { clientId_name: { clientId: initech.id, name: "Legacy Support" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 10,
      maximumCarryoverHours: 10,
      active: false,
      ...startAt(2025, 10),
    },
    create: {
      clientId: initech.id,
      name: "Legacy Support",
      type: "MANAGED_SERVICE",
      monthlyHours: 10,
      maximumCarryoverHours: 10,
      active: false,
      ...startAt(2025, 10),
    },
  });

  await upsertEntries(acmeSupport.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 32 },
    { year: 2026, month: 2, hoursUsed: 41 },
    { year: 2026, month: 3, hoursUsed: 38 },
    { year: 2026, month: 4, hoursUsed: 30 },
    { year: 2026, month: 5, hoursUsed: 48 },
    { year: 2026, month: 6, hoursUsed: 36 },
    { year: 2026, month: 7, hoursUsed: 52 },
    { year: 2026, month: 8, hoursUsed: 37.5 },
    { year: 2026, month: 9, hoursUsed: 22 },
  ]);

  await upsertEntries(acmeDev.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 18 },
    { year: 2026, month: 2, hoursUsed: 24 },
    { year: 2026, month: 3, hoursUsed: 31.5 },
    { year: 2026, month: 4, hoursUsed: 12 },
    { year: 2026, month: 5, hoursUsed: 40 },
    { year: 2026, month: 6, hoursUsed: 28 },
    { year: 2026, month: 7, hoursUsed: 16 },
    { year: 2026, month: 8, hoursUsed: 22.5 },
    { year: 2026, month: 9, hoursUsed: 8 },
  ]);

  await upsertEntries(nwErp.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 18 },
    { year: 2026, month: 2, hoursUsed: 20 },
    { year: 2026, month: 3, hoursUsed: 15 },
    { year: 2026, month: 4, hoursUsed: 22 },
    { year: 2026, month: 5, hoursUsed: 19 },
    { year: 2026, month: 6, hoursUsed: 14 },
    { year: 2026, month: 7, hoursUsed: 21 },
    { year: 2026, month: 8, hoursUsed: 17.5 },
    { year: 2026, month: 9, hoursUsed: 9 },
  ]);

  await upsertEntries(nwIntegrations.id, admin.id, [
    { year: 2026, month: 2, developmentHours: 9, pmHours: 2 },
    { year: 2026, month: 3, developmentHours: 5, pmHours: 1 },
    { year: 2026, month: 5, developmentHours: 12, pmHours: 2 },
    { year: 2026, month: 7, developmentHours: 8, pmHours: 1.5 },
    { year: 2026, month: 8, developmentHours: 3, pmHours: 1 },
  ]);

  await upsertEntries(globexCloud.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 55 },
    { year: 2026, month: 2, hoursUsed: 62 },
    { year: 2026, month: 3, hoursUsed: 58 },
    { year: 2026, month: 4, hoursUsed: 70 },
    { year: 2026, month: 5, hoursUsed: 44 },
    { year: 2026, month: 6, hoursUsed: 61 },
    { year: 2026, month: 7, hoursUsed: 49 },
    { year: 2026, month: 8, hoursUsed: 66 },
    { year: 2026, month: 9, hoursUsed: 28 },
  ]);

  await upsertEntries(globexSecurity.id, admin.id, [
    { year: 2026, month: 3, developmentHours: 16, pmHours: 4 },
    { year: 2026, month: 4, developmentHours: 10, pmHours: 2 },
    { year: 2026, month: 6, developmentHours: 6.5, pmHours: 1.5 },
    { year: 2026, month: 8, developmentHours: 12, pmHours: 3 },
  ]);

  await upsertEntries(initechLegacy.id, admin.id, [
    { year: 2025, month: 10, hoursUsed: 8 },
    { year: 2025, month: 11, hoursUsed: 12 },
    { year: 2025, month: 12, hoursUsed: 6 },
  ]);

  console.log("Seed complete. Demo login: admin / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
