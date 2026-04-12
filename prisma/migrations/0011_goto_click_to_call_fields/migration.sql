ALTER TABLE "User"
ADD COLUMN "gotoConnectLineId" TEXT;

ALTER TABLE "GoToConnectSettings"
ADD COLUMN "accessToken" TEXT,
ADD COLUMN "autoAnswer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phoneNumberId" TEXT;
