-- CreateTable
CREATE TABLE "IntegrationInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

CREATE INDEX "IntegrationInventory_name_idx" ON "IntegrationInventory"("name");
CREATE INDEX "IntegrationInventory_mvp_idx" ON "IntegrationInventory"("mvp");
CREATE INDEX "IntegrationInventory_direction_idx" ON "IntegrationInventory"("direction");
CREATE INDEX "IntegrationInventory_mode_idx" ON "IntegrationInventory"("mode");
CREATE INDEX "IntegrationInventory_format_idx" ON "IntegrationInventory"("format");
CREATE INDEX "IntegrationInventory_responsible_idx" ON "IntegrationInventory"("responsible");
CREATE INDEX "IntegrationInventory_pillar_idx" ON "IntegrationInventory"("pillar");
