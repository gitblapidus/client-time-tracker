-- AlterTable
ALTER TABLE "IntegrationInventory" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'In Scope';

-- CreateIndex
CREATE INDEX "IntegrationInventory_type_idx" ON "IntegrationInventory"("type");
