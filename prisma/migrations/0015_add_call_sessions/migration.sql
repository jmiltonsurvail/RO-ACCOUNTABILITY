CREATE TYPE "CallSessionStatus" AS ENUM ('QUEUED', 'FAILED');

CREATE TYPE "RecordingProcessingStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TYPE "TranscriptProcessingStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TABLE "CallSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "initiatedByUserId" TEXT,
    "asmNumber" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "sourceLineId" TEXT,
    "sourceExtension" TEXT,
    "goToInitiatorId" TEXT,
    "status" "CallSessionStatus" NOT NULL DEFAULT 'QUEUED',
    "recordingStatus" "RecordingProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "transcriptStatus" "TranscriptProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "storagePrefix" TEXT NOT NULL,
    "rawRecordingObjectKey" TEXT,
    "processedRecordingObjectKey" TEXT,
    "transcriptJsonObjectKey" TEXT,
    "transcriptTextObjectKey" TEXT,
    "lastError" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallSession_goToInitiatorId_key" ON "CallSession"("goToInitiatorId");
CREATE INDEX "CallSession_organizationId_requestedAt_idx" ON "CallSession"("organizationId", "requestedAt");
CREATE INDEX "CallSession_repairOrderId_requestedAt_idx" ON "CallSession"("repairOrderId", "requestedAt");

ALTER TABLE "CallSession"
ADD CONSTRAINT "CallSession_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSession"
ADD CONSTRAINT "CallSession_repairOrderId_fkey"
FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CallSession"
ADD CONSTRAINT "CallSession_initiatedByUserId_fkey"
FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
