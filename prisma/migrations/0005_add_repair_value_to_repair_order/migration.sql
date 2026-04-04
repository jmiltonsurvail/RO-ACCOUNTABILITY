CREATE TYPE "RepairValue" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "RepairOrder"
ADD COLUMN "repairValue" "RepairValue";
