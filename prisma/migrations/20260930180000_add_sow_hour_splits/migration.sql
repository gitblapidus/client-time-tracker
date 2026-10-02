-- AlterTable
ALTER TABLE "Project" ADD COLUMN "quotedDevelopmentHours" REAL;
ALTER TABLE "Project" ADD COLUMN "quotedDeliveryLeadHours" REAL;
ALTER TABLE "Project" ADD COLUMN "quotedTechnicalLeadershipHours" REAL;

UPDATE "Project"
SET
  "quotedDevelopmentHours" = COALESCE("quotedHours", 0),
  "quotedDeliveryLeadHours" = 0,
  "quotedTechnicalLeadershipHours" = 0
WHERE "type" = 'SOW';

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "deliveryLeadHours" REAL;
ALTER TABLE "TimeEntry" ADD COLUMN "technicalLeadershipHours" REAL;
