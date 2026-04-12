-- DropIndex
DROP INDEX "RepairOrder_asmNumber_isActive_idx";

-- DropIndex
DROP INDEX "RepairOrder_mode_isActive_idx";

-- AlterTable
ALTER TABLE "GoToConnectSettings" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SlaSettings" ALTER COLUMN "id" DROP DEFAULT;
