ALTER TABLE "User"
ADD COLUMN "gotoConnectMessagingSubscriptionConfiguredAt" TIMESTAMP(3),
ADD COLUMN "gotoConnectMessagingSubscriptionId" TEXT,
ADD COLUMN "gotoConnectSmsPhoneNumber" TEXT;

CREATE INDEX "User_organizationId_gotoConnectSmsPhoneNumber_idx"
ON "User"("organizationId", "gotoConnectSmsPhoneNumber");
