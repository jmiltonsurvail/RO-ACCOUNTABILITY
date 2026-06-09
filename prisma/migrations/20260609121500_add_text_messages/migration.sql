CREATE TYPE "TextMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

ALTER TABLE "GoToConnectSettings"
ADD COLUMN "messagingSubscriptionConfiguredAt" TIMESTAMP(3),
ADD COLUMN "messagingSubscriptionId" TEXT;

CREATE TABLE "TextMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "advisorUserId" TEXT,
    "direction" "TextMessageDirection" NOT NULL,
    "providerMessageId" TEXT,
    "conversationKey" TEXT,
    "ownerPhoneNumber" TEXT,
    "contactPhoneNumber" TEXT,
    "authorPhoneNumber" TEXT,
    "body" TEXT,
    "deliveryStatus" TEXT,
    "rawPayload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TextMessage_organizationId_providerMessageId_key" ON "TextMessage"("organizationId", "providerMessageId");
CREATE INDEX "TextMessage_organizationId_sentAt_idx" ON "TextMessage"("organizationId", "sentAt");
CREATE INDEX "TextMessage_repairOrderId_sentAt_idx" ON "TextMessage"("repairOrderId", "sentAt");
CREATE INDEX "TextMessage_conversationKey_idx" ON "TextMessage"("conversationKey");

ALTER TABLE "TextMessage"
ADD CONSTRAINT "TextMessage_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TextMessage"
ADD CONSTRAINT "TextMessage_repairOrderId_fkey"
FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TextMessage"
ADD CONSTRAINT "TextMessage_advisorUserId_fkey"
FOREIGN KEY ("advisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
