ALTER TABLE "CallSession"
ADD COLUMN "callAnsweredAt" TIMESTAMP(3),
ADD COLUMN "callState" TEXT,
ADD COLUMN "callerOutcome" TEXT,
ADD COLUMN "goToAiSummary" TEXT,
ADD COLUMN "goToPrimaryRecordingId" TEXT,
ADD COLUMN "goToRecordingIds" JSONB;
