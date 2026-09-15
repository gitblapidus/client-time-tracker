-- AlterTable
ALTER TABLE "Project" ADD COLUMN "productionManager" TEXT;

-- CreateTable
CREATE TABLE "ProductionManager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionManager_name_key" ON "ProductionManager"("name");

-- CreateIndex
CREATE INDEX "ProductionManager_name_idx" ON "ProductionManager"("name");

-- CreateIndex
CREATE INDEX "Project_productionManager_idx" ON "Project"("productionManager");
