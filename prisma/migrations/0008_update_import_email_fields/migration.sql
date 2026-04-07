ALTER TABLE "RepairOrder"
ADD COLUMN "email" TEXT;

UPDATE "RepairOrder"
SET "email" = "flags"
WHERE "flags" IS NOT NULL;

ALTER TABLE "RepairOrder"
DROP COLUMN "flags",
DROP COLUMN "mtDisplayRaw",
DROP COLUMN "ttDisplayRaw";
