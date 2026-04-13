ALTER TABLE "PlatformIntegrationSettings"
ADD COLUMN "awsProvisioningAccessKeyId" TEXT,
ADD COLUMN "awsProvisioningSecretAccessKey" TEXT;

ALTER TABLE "GoToConnectSettings"
ADD COLUMN "recordingAwsRegion" TEXT,
ADD COLUMN "recordingIamAccessKeyId" TEXT,
ADD COLUMN "recordingIamUserName" TEXT,
ADD COLUMN "recordingProvisionedAt" TIMESTAMP(3),
ADD COLUMN "recordingS3Bucket" TEXT;

ALTER TABLE "CallSession"
ADD COLUMN "storageBucket" TEXT;
