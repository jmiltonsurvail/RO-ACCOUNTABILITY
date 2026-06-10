ALTER TYPE "ActivityType" ADD VALUE 'RO_NOTE_ADDED';

CREATE TABLE "RepairOrderNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "userId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairOrderNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepairOrderNote_organizationId_createdAt_idx" ON "RepairOrderNote"("organizationId", "createdAt");
CREATE INDEX "RepairOrderNote_repairOrderId_createdAt_idx" ON "RepairOrderNote"("repairOrderId", "createdAt");

ALTER TABLE "RepairOrderNote"
ADD CONSTRAINT "RepairOrderNote_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrderNote"
ADD CONSTRAINT "RepairOrderNote_repairOrderId_fkey"
FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrderNote"
ADD CONSTRAINT "RepairOrderNote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
