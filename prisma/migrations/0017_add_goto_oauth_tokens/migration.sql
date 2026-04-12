ALTER TABLE "GoToConnectSettings"
ADD COLUMN "accountName" TEXT,
ADD COLUMN "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "refreshToken" TEXT;
