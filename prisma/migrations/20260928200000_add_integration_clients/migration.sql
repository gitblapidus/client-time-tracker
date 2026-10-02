-- CreateTable
CREATE TABLE "IntegrationClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "executiveName" TEXT,
    "spocName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "IntegrationClient_name_key" ON "IntegrationClient"("name");
CREATE INDEX "IntegrationClient_active_idx" ON "IntegrationClient"("active");
CREATE INDEX "IntegrationClient_name_idx" ON "IntegrationClient"("name");

-- CreateTable
CREATE TABLE "IntegrationProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productionManager" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationProject_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "IntegrationClient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IntegrationProject_clientId_name_key" ON "IntegrationProject"("clientId", "name");
CREATE INDEX "IntegrationProject_clientId_idx" ON "IntegrationProject"("clientId");
CREATE INDEX "IntegrationProject_active_idx" ON "IntegrationProject"("active");
CREATE INDEX "IntegrationProject_productionManager_idx" ON "IntegrationProject"("productionManager");
