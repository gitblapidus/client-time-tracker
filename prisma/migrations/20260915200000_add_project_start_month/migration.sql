-- AlterTable
ALTER TABLE "Project" ADD COLUMN "startYear" INTEGER NOT NULL DEFAULT 2026;
ALTER TABLE "Project" ADD COLUMN "startMonth" INTEGER NOT NULL DEFAULT 1;

-- createdAt is stored as unix milliseconds in SQLite.
UPDATE "Project"
SET
  "startYear" = CAST(strftime('%Y', datetime("createdAt" / 1000.0, 'unixepoch')) AS INTEGER),
  "startMonth" = CAST(strftime('%m', datetime("createdAt" / 1000.0, 'unixepoch')) AS INTEGER)
WHERE typeof("createdAt") IN ('integer', 'real');

UPDATE "Project"
SET
  "startYear" = CAST(strftime('%Y', "createdAt") AS INTEGER),
  "startMonth" = CAST(strftime('%m', "createdAt") AS INTEGER)
WHERE typeof("createdAt") = 'text';
