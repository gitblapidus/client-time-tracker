-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IntegrationInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mvp" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "dataSource" TEXT,
    "dataTarget" TEXT,
    "responsible" TEXT,
    "pillar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_IntegrationInventory" ("id", "referenceId", "name", "description", "mvp", "direction", "mode", "format", "dataSource", "dataTarget", "responsible", "pillar", "createdAt", "updatedAt")
SELECT
    "id",
    'INT-' || printf('%04d', (
      SELECT COUNT(*)
      FROM "IntegrationInventory" AS "other"
      WHERE "other"."rowid" <= "IntegrationInventory"."rowid"
    )),
    "name",
    "description",
    "mvp",
    "direction",
    "mode",
    "format",
    "dataSource",
    "dataTarget",
    "responsible",
    "pillar",
    "createdAt",
    "updatedAt"
FROM "IntegrationInventory";
DROP TABLE "IntegrationInventory";
ALTER TABLE "new_IntegrationInventory" RENAME TO "IntegrationInventory";
CREATE UNIQUE INDEX "IntegrationInventory_referenceId_key" ON "IntegrationInventory"("referenceId");
CREATE INDEX "IntegrationInventory_name_idx" ON "IntegrationInventory"("name");
CREATE INDEX "IntegrationInventory_mvp_idx" ON "IntegrationInventory"("mvp");
CREATE INDEX "IntegrationInventory_direction_idx" ON "IntegrationInventory"("direction");
CREATE INDEX "IntegrationInventory_mode_idx" ON "IntegrationInventory"("mode");
CREATE INDEX "IntegrationInventory_format_idx" ON "IntegrationInventory"("format");
CREATE INDEX "IntegrationInventory_responsible_idx" ON "IntegrationInventory"("responsible");
CREATE INDEX "IntegrationInventory_pillar_idx" ON "IntegrationInventory"("pillar");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
