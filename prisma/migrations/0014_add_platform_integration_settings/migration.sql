CREATE TABLE "PlatformIntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "awsRegion" TEXT,
    "s3Bucket" TEXT,
    "s3RawRecordingsPrefix" TEXT,
    "s3ProcessedCallsPrefix" TEXT,
    "openAiApiKey" TEXT,
    "openAiTranscriptionModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformIntegrationSettings_pkey" PRIMARY KEY ("id")
);
