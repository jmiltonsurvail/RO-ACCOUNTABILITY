ALTER TABLE "TextMessage"
ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "TextMessage_repairOrderId_direction_readAt_idx"
ON "TextMessage"("repairOrderId", "direction", "readAt");
