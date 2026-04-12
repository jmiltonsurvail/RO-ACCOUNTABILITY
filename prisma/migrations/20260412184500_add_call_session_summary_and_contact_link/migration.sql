ALTER TABLE "CallSession"
ADD COLUMN "callSummary" TEXT;

ALTER TABLE "ContactRecord"
ADD COLUMN "callSessionId" TEXT;

ALTER TABLE "ContactRecord"
ADD CONSTRAINT "ContactRecord_callSessionId_fkey"
FOREIGN KEY ("callSessionId") REFERENCES "CallSession"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "ContactRecord_callSessionId_idx" ON "ContactRecord"("callSessionId");
