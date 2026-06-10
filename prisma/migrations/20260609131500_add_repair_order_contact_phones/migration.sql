CREATE TABLE "RepairOrderContactPhone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairOrderContactPhone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepairOrderContactPhone_repairOrderId_phoneNumber_key"
ON "RepairOrderContactPhone"("repairOrderId", "phoneNumber");

CREATE INDEX "RepairOrderContactPhone_organizationId_phoneNumber_idx"
ON "RepairOrderContactPhone"("organizationId", "phoneNumber");

ALTER TABLE "RepairOrderContactPhone"
ADD CONSTRAINT "RepairOrderContactPhone_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrderContactPhone"
ADD CONSTRAINT "RepairOrderContactPhone_repairOrderId_fkey"
FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepairOrderContactPhone"
ADD CONSTRAINT "RepairOrderContactPhone_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
