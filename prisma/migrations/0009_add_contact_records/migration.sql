CREATE TABLE "ContactRecord" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerNotes" TEXT,
    "advisorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactRecord_repairOrderId_contactedAt_idx" ON "ContactRecord"("repairOrderId", "contactedAt");

ALTER TABLE "ContactRecord"
ADD CONSTRAINT "ContactRecord_repairOrderId_fkey"
FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContactRecord"
ADD CONSTRAINT "ContactRecord_advisorUserId_fkey"
FOREIGN KEY ("advisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ContactRecord" ("id", "repairOrderId", "contactedAt", "customerNotes", "advisorUserId", "createdAt")
SELECT
  CONCAT('contact-record-', "id"),
  "repairOrderId",
  COALESCE("contactedAt", "updatedAt", "createdAt"),
  "customerNotes",
  "advisorUserId",
  COALESCE("contactedAt", "updatedAt", "createdAt")
FROM "ContactState"
WHERE "contacted" = true;
