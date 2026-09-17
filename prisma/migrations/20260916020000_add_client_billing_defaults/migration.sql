-- AlterTable
ALTER TABLE "Client" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Client" ADD COLUMN "devRate" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Client" ADD COLUMN "pmRate" REAL NOT NULL DEFAULT 0;

UPDATE "Client"
SET "currency" = COALESCE((
  SELECT p."currency" FROM "Project" p
  WHERE p."clientId" = "Client"."id"
    AND p."type" = 'CAPITAL_TIME_AND_MATERIALS'
    AND p."currency" IS NOT NULL
  ORDER BY p."updatedAt" DESC
  LIMIT 1
), "currency");

UPDATE "Client"
SET "devRate" = COALESCE((
  SELECT p."devRate" FROM "Project" p
  WHERE p."clientId" = "Client"."id"
    AND p."type" = 'CAPITAL_TIME_AND_MATERIALS'
    AND p."devRate" IS NOT NULL
  ORDER BY p."updatedAt" DESC
  LIMIT 1
), "devRate");

UPDATE "Client"
SET "pmRate" = COALESCE((
  SELECT p."pmRate" FROM "Project" p
  WHERE p."clientId" = "Client"."id"
    AND p."type" = 'CAPITAL_TIME_AND_MATERIALS'
    AND p."pmRate" IS NOT NULL
  ORDER BY p."updatedAt" DESC
  LIMIT 1
), "pmRate");
