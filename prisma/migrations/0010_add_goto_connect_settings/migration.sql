ALTER TABLE "User"
ADD COLUMN "gotoConnectExtension" TEXT;

CREATE TABLE "GoToConnectSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "organizationId" TEXT,
    "launchUrlTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoToConnectSettings_pkey" PRIMARY KEY ("id")
);
