ALTER TABLE "GoToConnectSettings"
ADD COLUMN "callEventsConfiguredAt" TIMESTAMP(3),
ADD COLUMN "callEventsReportSubscriptionId" TEXT,
ADD COLUMN "notificationChannelId" TEXT,
ADD COLUMN "notificationWebhookToken" TEXT;

ALTER TABLE "CallSession"
ADD COLUMN "callCreatedAt" TIMESTAMP(3),
ADD COLUMN "callEndedAt" TIMESTAMP(3),
ADD COLUMN "conversationSpaceId" TEXT,
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "rawCallReportJson" JSONB,
ADD COLUMN "wasConnected" BOOLEAN;
