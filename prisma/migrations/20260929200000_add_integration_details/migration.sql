-- CreateTable
CREATE TABLE "IntegrationDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "overview" TEXT,
    "assumptions" JSON NOT NULL DEFAULT '[]',
    "source" TEXT,
    "target" TEXT,
    "interfaceType" TEXT,
    "interfaceFormat" TEXT,
    "dataDependencies" TEXT,
    "jobDependencies" TEXT,
    "frequency" TEXT,
    "scheduledMechanism" TEXT,
    "performanceConsiderations" TEXT,
    "interfaceTimeoutValue" TEXT,
    "expectedDataVolume" TEXT,
    "solutionApproach" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationDetails_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "IntegrationInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationDetails_inventoryId_key" ON "IntegrationDetails"("inventoryId");
