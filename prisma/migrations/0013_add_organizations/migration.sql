ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SERVICE_SYNCNOW_ADMIN';

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" ("id", "name", "slug", "active", "createdAt", "updatedAt")
VALUES ('org_default', 'Default Organization', 'default-org', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ImportBatch" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "RepairOrder" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "SlaSettings" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "GoToConnectSettings" ADD COLUMN "organizationId_new" TEXT;
ALTER TABLE "AlertRule" ADD COLUMN "organizationId" TEXT;

ALTER TABLE "GoToConnectSettings" RENAME COLUMN "organizationId" TO "goToOrganizationId";

UPDATE "User"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "ImportBatch"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "RepairOrder"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "SlaSettings"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

UPDATE "GoToConnectSettings"
SET "organizationId_new" = 'org_default'
WHERE "organizationId_new" IS NULL;

UPDATE "AlertRule"
SET "organizationId" = 'org_default'
WHERE "organizationId" IS NULL;

ALTER TABLE "ImportBatch" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "RepairOrder" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "SlaSettings" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "GoToConnectSettings" ALTER COLUMN "organizationId_new" SET NOT NULL;
ALTER TABLE "AlertRule" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "GoToConnectSettings" RENAME COLUMN "organizationId_new" TO "organizationId";

ALTER TABLE "User"
ADD CONSTRAINT "User_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportBatch"
ADD CONSTRAINT "ImportBatch_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RepairOrder"
ADD CONSTRAINT "RepairOrder_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SlaSettings"
ADD CONSTRAINT "SlaSettings_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GoToConnectSettings"
ADD CONSTRAINT "GoToConnectSettings_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlertRule"
ADD CONSTRAINT "AlertRule_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "User_role_asmNumber_key";
DROP INDEX IF EXISTS "User_role_techNumber_key";
DROP INDEX IF EXISTS "RepairOrder_roNumber_key";
DROP INDEX IF EXISTS "AlertRule_trigger_key";

CREATE UNIQUE INDEX "User_organizationId_role_asmNumber_key" ON "User"("organizationId", "role", "asmNumber");
CREATE UNIQUE INDEX "User_organizationId_role_techNumber_key" ON "User"("organizationId", "role", "techNumber");
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

CREATE UNIQUE INDEX "RepairOrder_organizationId_roNumber_key" ON "RepairOrder"("organizationId", "roNumber");
CREATE INDEX "RepairOrder_organizationId_isActive_idx" ON "RepairOrder"("organizationId", "isActive");
CREATE INDEX "RepairOrder_organizationId_asmNumber_isActive_idx" ON "RepairOrder"("organizationId", "asmNumber", "isActive");
CREATE INDEX "RepairOrder_organizationId_mode_isActive_idx" ON "RepairOrder"("organizationId", "mode", "isActive");

CREATE UNIQUE INDEX "SlaSettings_organizationId_key" ON "SlaSettings"("organizationId");
CREATE UNIQUE INDEX "GoToConnectSettings_organizationId_key" ON "GoToConnectSettings"("organizationId");
CREATE UNIQUE INDEX "AlertRule_organizationId_trigger_key" ON "AlertRule"("organizationId", "trigger");
