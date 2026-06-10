ALTER TABLE "CallSession"
ADD COLUMN "missedInboundCall" BOOLEAN NOT NULL DEFAULT false;

UPDATE "CallSession"
SET "missedInboundCall" = true
WHERE UPPER(COALESCE("callDirection", '')) = 'INBOUND'
  AND (
    COALESCE("wasConnected", false) = false
    OR "callAnsweredAt" IS NULL
    OR "initiatedByUserId" IS NULL
  );

CREATE INDEX "CallSession_repairOrderId_missedInboundCall_idx"
ON "CallSession"("repairOrderId", "missedInboundCall");
