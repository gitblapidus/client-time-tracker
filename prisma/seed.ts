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

  const acmeCorporation = await prisma.client.upsert({
    where: { name: "Acme Corporation" },
    update: {
      financeEmail: "finance@acme.example, ap@acme.example",
      executiveName: "Pat Rivera",
      executiveEmail: "pat.rivera@acme.example",
      spocName: "Casey Nguyen",
      spocEmail: "casey.nguyen@acme.example",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: false,
    },
    create: {
      name: "Acme Corporation",
      financeEmail: "finance@acme.example, ap@acme.example",
      executiveName: "Pat Rivera",
      executiveEmail: "pat.rivera@acme.example",
      spocName: "Casey Nguyen",
      spocEmail: "casey.nguyen@acme.example",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: false,
    },
  });

  const blTest = await prisma.client.upsert({
    where: { name: "BL_Test" },
    update: {
      financeEmail: null,
      executiveName: "Brad",
      executiveEmail: "btest@gmail.com",
      spocName: "Brad Lapidus",
      spocEmail: "blapiudus@gmail.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
    create: {
      name: "BL_Test",
      financeEmail: null,
      executiveName: "Brad",
      executiveEmail: "btest@gmail.com",
      spocName: "Brad Lapidus",
      spocEmail: "blapiudus@gmail.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
  });

  const dbnext = await prisma.client.upsert({
    where: { name: "DBNEXT" },
    update: {
      financeEmail: "r.roels@dbnext.fr",
      executiveName: "Romain ROELS",
      executiveEmail: "r.roels@dbnext.fr",
      spocName: "Romain ROELS",
      spocEmail: "r.roels@dbnext.fr",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
    create: {
      name: "DBNEXT",
      financeEmail: "r.roels@dbnext.fr",
      executiveName: "Romain ROELS",
      executiveEmail: "r.roels@dbnext.fr",
      spocName: "Romain ROELS",
      spocEmail: "r.roels@dbnext.fr",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
  });

  const kion = await prisma.client.upsert({
    where: { name: "KION" },
    update: {
      financeEmail: "Summerville.AP@kiongroup.com, steven.romero@kiongroup.com",
      executiveName: "Joe Ritter",
      executiveEmail: "joe.ritter@kiongroup.com",
      spocName: "Steven Romero",
      spocEmail: "steven.romero@kiongroup.com",
      currency: "EUR",
      devRate: 95,
      pmRate: 125,
      active: true,
    },
    create: {
      name: "KION",
      financeEmail: "Summerville.AP@kiongroup.com, steven.romero@kiongroup.com",
      executiveName: "Joe Ritter",
      executiveEmail: "joe.ritter@kiongroup.com",
      spocName: "Steven Romero",
      spocEmail: "steven.romero@kiongroup.com",
      currency: "EUR",
      devRate: 95,
      pmRate: 125,
      active: true,
    },
  });

  const packDISCOUNT = await prisma.client.upsert({
    where: { name: "PACK DISCOUNT" },
    update: {
      financeEmail: "tessieraurelien@packdiscount.com, nouetcedric@packdiscount.com",
      executiveName: "Aurelien Tessier",
      executiveEmail: "tessieraurelien@packdiscount.com",
      spocName: "Cedric NOET",
      spocEmail: "nouetcedric@packdiscount.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
    create: {
      name: "PACK DISCOUNT",
      financeEmail: "tessieraurelien@packdiscount.com, nouetcedric@packdiscount.com",
      executiveName: "Aurelien Tessier",
      executiveEmail: "tessieraurelien@packdiscount.com",
      spocName: "Cedric NOET",
      spocEmail: "nouetcedric@packdiscount.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
  });

  const trenois = await prisma.client.upsert({
    where: { name: "TRENOIS" },
    update: {
      financeEmail: "factrenoisfg@trenois.com, xdanel@trenois.com",
      executiveName: "Christophe SION",
      executiveEmail: "csion@trenois.com",
      spocName: "Christophe SION",
      spocEmail: "csion@trenois.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
    create: {
      name: "TRENOIS",
      financeEmail: "factrenoisfg@trenois.com, xdanel@trenois.com",
      executiveName: "Christophe SION",
      executiveEmail: "csion@trenois.com",
      spocName: "Christophe SION",
      spocEmail: "csion@trenois.com",
      currency: "USD",
      devRate: 0,
      pmRate: 0,
      active: true,
    },
  });

  const vanderschooten = await prisma.client.upsert({
    where: { name: "VANDERSCHOOTEN" },
    update: {
      financeEmail: "compta-fournisseurs@vanderschooten.com",
      executiveName: "Bertrand LIBERAL",
      executiveEmail: "bliberal@vanderschooten.com",
      spocName: "Tony WILLERY",
      spocEmail: "twillery@vanderschooten.com",
      currency: "USD",
      devRate: 80,
      pmRate: 120,
      active: true,
    },
    create: {
      name: "VANDERSCHOOTEN",
      financeEmail: "compta-fournisseurs@vanderschooten.com",
      executiveName: "Bertrand LIBERAL",
      executiveEmail: "bliberal@vanderschooten.com",
      spocName: "Tony WILLERY",
      spocEmail: "twillery@vanderschooten.com",
      currency: "USD",
      devRate: 80,
      pmRate: 120,
      active: true,
    },
  });

  for (const name of [
    "Adam Wiener",
    "Brad Lapidus",
    "Chris Diaz",
    "Morgan Blake",
    "Riley Chen",
    "Sam Patel",
  ]) {
    await prisma.productionManager.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const acmeCorporationApplicationSupport = await prisma.project.upsert({
    where: { clientId_name: { clientId: acmeCorporation.id, name: "Application Support" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: null,
      productionManager: "Morgan Blake",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: false,
      ...startAt(2026, 1),
    },
    create: {
      clientId: acmeCorporation.id,
      name: "Application Support",
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: null,
      productionManager: "Morgan Blake",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: false,
      ...startAt(2026, 1),
    },
  });

  const acmeCorporationDevelopment = await prisma.project.upsert({
    where: { clientId_name: { clientId: acmeCorporation.id, name: "Development" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Chris Diaz",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: false,
      ...startAt(2026, 1),
    },
    create: {
      clientId: acmeCorporation.id,
      name: "Development",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Chris Diaz",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: false,
      ...startAt(2026, 1),
    },
  });

  const dbnextDBNAdditionalMonthlyHours = await prisma.project.upsert({
    where: { clientId_name: { clientId: dbnext.id, name: "DBN_Additional Monthly Hours" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 8),
    },
    create: {
      clientId: dbnext.id,
      name: "DBN_Additional Monthly Hours",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 8),
    },
  });

  const dbnextDBNManagedService = await prisma.project.upsert({
    where: { clientId_name: { clientId: dbnext.id, name: "DBN_Managed Service" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 10,
      maximumCarryoverHours: 10,
      openingCarryoverHours: 0,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 8),
    },
    create: {
      clientId: dbnext.id,
      name: "DBN_Managed Service",
      type: "MANAGED_SERVICE",
      monthlyHours: 10,
      maximumCarryoverHours: 10,
      openingCarryoverHours: 0,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 8),
    },
  });

  const kionKIONCapitalERP = await prisma.project.upsert({
    where: { clientId_name: { clientId: kion.id, name: "KION Capital ERP" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: null,
      estimatedDevHours: 120,
      currency: "EUR",
      devRate: 95,
      estimatedPmHours: 20,
      pmRate: 125,
      burnStatus: "UAT",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: kion.id,
      name: "KION Capital ERP",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: null,
      estimatedDevHours: 120,
      currency: "EUR",
      devRate: 95,
      estimatedPmHours: 20,
      pmRate: 125,
      burnStatus: "UAT",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const kionKIONManagedServices = await prisma.project.upsert({
    where: { clientId_name: { clientId: kion.id, name: "KION Managed Services" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 40,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: kion.id,
      name: "KION Managed Services",
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 40,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const packDISCOUNTPDManagedService = await prisma.project.upsert({
    where: { clientId_name: { clientId: packDISCOUNT.id, name: "PD_Managed Service" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 0,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 1),
    },
    create: {
      clientId: packDISCOUNT.id,
      name: "PD_Managed Service",
      type: "MANAGED_SERVICE",
      monthlyHours: 40,
      maximumCarryoverHours: 40,
      openingCarryoverHours: 0,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 1),
    },
  });

  const trenoisTRNManagedServices = await prisma.project.upsert({
    where: { clientId_name: { clientId: trenois.id, name: "TRN_Managed Services" } },
    update: {
      type: "MANAGED_SERVICE",
      monthlyHours: 50,
      maximumCarryoverHours: 50,
      openingCarryoverHours: 46.5,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: trenois.id,
      name: "TRN_Managed Services",
      type: "MANAGED_SERVICE",
      monthlyHours: 50,
      maximumCarryoverHours: 50,
      openingCarryoverHours: 46.5,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSGeneralSupport = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS - General Support" } },
    update: {
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS - General Support",
      type: "TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: null,
      currency: null,
      devRate: null,
      estimatedPmHours: null,
      pmRate: null,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSADemainRevampProject = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_A Demain Revamp Project" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "In Progress",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_A Demain Revamp Project",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "In Progress",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSCRMProject = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_CRM Project" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Complete",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_CRM Project",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Complete",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSDoofinderProject = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_Doofinder Project" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_Doofinder Project",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSOnePageChedkout = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_One Page Chedkout" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Complete",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_One Page Chedkout",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Complete",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSSEOProject = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_SEO Project" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_SEO Project",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Not Started",
      active: true,
      ...startAt(2026, 9),
    },
  });

  const vanderschootenVDSSystemUpgradeMariaDBOpenSearchValkey = await prisma.project.upsert({
    where: { clientId_name: { clientId: vanderschooten.id, name: "VDS_System Upgrade (MariaDB, OpenSearch & Valkey)" } },
    update: {
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Pending Deployment",
      active: true,
      ...startAt(2026, 9),
    },
    create: {
      clientId: vanderschooten.id,
      name: "VDS_System Upgrade (MariaDB, OpenSearch & Valkey)",
      type: "CAPITAL_TIME_AND_MATERIALS",
      monthlyHours: null,
      maximumCarryoverHours: null,
      openingCarryoverHours: null,
      productionManager: "Brad Lapidus",
      estimatedDevHours: 0,
      currency: "USD",
      devRate: 80,
      estimatedPmHours: 0,
      pmRate: 120,
      burnStatus: "Pending Deployment",
      active: true,
      ...startAt(2026, 9),
    },
  });

  await upsertEntries(acmeCorporationApplicationSupport.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 32 },
    { year: 2026, month: 2, hoursUsed: 41 },
    { year: 2026, month: 3, hoursUsed: 38 },
    { year: 2026, month: 4, hoursUsed: 30 },
    { year: 2026, month: 5, hoursUsed: 48 },
    { year: 2026, month: 6, hoursUsed: 36 },
    { year: 2026, month: 7, hoursUsed: 52 },
    { year: 2026, month: 8, hoursUsed: 37.5 },
    { year: 2026, month: 9, hoursUsed: 75 },
  ]);

  await upsertEntries(acmeCorporationDevelopment.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 18, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 24, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 31.5, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 12, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 40, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 28, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 16, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 22.5, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 8, pmHours: 0 },
  ]);

  await upsertEntries(dbnextDBNAdditionalMonthlyHours.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 19, pmHours: 4.5 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(dbnextDBNManagedService.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 0 },
    { year: 2026, month: 2, hoursUsed: 0 },
    { year: 2026, month: 3, hoursUsed: 0 },
    { year: 2026, month: 4, hoursUsed: 0 },
    { year: 2026, month: 5, hoursUsed: 0 },
    { year: 2026, month: 6, hoursUsed: 0 },
    { year: 2026, month: 7, hoursUsed: 0 },
    { year: 2026, month: 8, hoursUsed: 10 },
    { year: 2026, month: 9, hoursUsed: 0 },
  ]);

  await upsertEntries(kionKIONCapitalERP.id, admin.id, [
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(kionKIONManagedServices.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 26 },
    { year: 2026, month: 2, hoursUsed: 47.5 },
    { year: 2026, month: 3, hoursUsed: 39 },
    { year: 2026, month: 4, hoursUsed: 33.5 },
    { year: 2026, month: 5, hoursUsed: 40 },
    { year: 2026, month: 6, hoursUsed: 31.5 },
    { year: 2026, month: 7, hoursUsed: 79 },
    { year: 2026, month: 8, hoursUsed: 42 },
    { year: 2026, month: 9, hoursUsed: 3 },
  ]);

  await upsertEntries(packDISCOUNTPDManagedService.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 76.5 },
    { year: 2026, month: 2, hoursUsed: 36.5 },
    { year: 2026, month: 3, hoursUsed: 14.5 },
    { year: 2026, month: 4, hoursUsed: 28 },
    { year: 2026, month: 5, hoursUsed: 40 },
    { year: 2026, month: 6, hoursUsed: 45 },
    { year: 2026, month: 7, hoursUsed: 29 },
    { year: 2026, month: 8, hoursUsed: 12 },
    { year: 2026, month: 9, hoursUsed: 0 },
  ]);

  await upsertEntries(trenoisTRNManagedServices.id, admin.id, [
    { year: 2026, month: 1, hoursUsed: 0 },
    { year: 2026, month: 2, hoursUsed: 0 },
    { year: 2026, month: 3, hoursUsed: 0 },
    { year: 2026, month: 4, hoursUsed: 0 },
    { year: 2026, month: 5, hoursUsed: 0 },
    { year: 2026, month: 6, hoursUsed: 0 },
    { year: 2026, month: 7, hoursUsed: 0 },
    { year: 2026, month: 8, hoursUsed: 0 },
    { year: 2026, month: 9, hoursUsed: 26 },
  ]);

  await upsertEntries(vanderschootenVDSGeneralSupport.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(vanderschootenVDSADemainRevampProject.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(vanderschootenVDSCRMProject.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(vanderschootenVDSDoofinderProject.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 10, pmHours: 5 },
  ]);

  await upsertEntries(vanderschootenVDSOnePageChedkout.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(vanderschootenVDSSEOProject.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
  ]);

  await upsertEntries(vanderschootenVDSSystemUpgradeMariaDBOpenSearchValkey.id, admin.id, [
    { year: 2026, month: 1, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 2, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 3, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 4, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 5, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 6, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 7, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 8, developmentHours: 0, pmHours: 0 },
    { year: 2026, month: 9, developmentHours: 0, pmHours: 0 },
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
