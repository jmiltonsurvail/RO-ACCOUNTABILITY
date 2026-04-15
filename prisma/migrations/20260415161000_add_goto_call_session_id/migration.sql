-- Add a dedicated GoTo call session identifier so recordings and event payloads
-- can be matched directly instead of only by initiator/conversation inference.
ALTER TABLE "CallSession"
ADD COLUMN "goToCallSessionId" TEXT;

CREATE UNIQUE INDEX "CallSession_goToCallSessionId_key"
ON "CallSession"("goToCallSessionId");
