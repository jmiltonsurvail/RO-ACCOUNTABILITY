-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DISPATCHER', 'ADVISOR', 'MANAGER');

-- CreateEnum
CREATE TYPE "BlockerReason" AS ENUM ('WAITING_ON_CUSTOMER_APPROVAL', 'PARTS_BACKORDERED', 'WRONG_OR_DEFECTIVE_PART', 'WAITING_ON_SUBLET_OR_OUTSIDE_VENDOR', 'WAITING_ON_EXTENDED_WARRANTY_AUTHORIZATION', 'QUALITY_CONTROL_REVIEW', 'RECHECK_OR_COMEBACK_IN_PROGRESS', 'TECH_OVERLOADED_TOO_MANY_JOBS_ASSIGNED', 'TECH_BEHIND_ON_CURRENT_JOB', 'TECH_UNAVAILABLE_OUT_BREAK_END_OF_DAY', 'ADVISOR_MUST_CONTACT_CUSTOMER', 'WAITING_ON_SPECIAL_ORDER_OR_SPECIALTY_PART', 'WAITING_ON_TSB_OR_TECHNICAL_INFORMATION', 'OTHER_NOTES_REQUIRED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('IMPORT_BATCH_CREATED', 'IMPORT_ROW_SYNCED', 'IMPORT_ROW_SKIPPED', 'RO_INACTIVATED', 'BLOCKER_UPSERTED', 'BLOCKER_CLEARED', 'CONTACT_UPDATED', 'CONTACT_RESET');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "asmNumber" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceRowCount" INTEGER NOT NULL,
    "importedRowCount" INTEGER NOT NULL DEFAULT 0,
    "skippedRowCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRowError" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "roNumber" INTEGER,
    "reason" TEXT NOT NULL,
    "rawRowJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRowError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairOrder" (
    "id" TEXT NOT NULL,
    "roNumber" INTEGER NOT NULL,
    "tag" TEXT,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "flags" TEXT,
    "phone" TEXT,
    "asmNumber" INTEGER NOT NULL,
    "techNumber" INTEGER,
    "mode" TEXT NOT NULL,
    "mtRaw" TEXT,
    "ttRaw" TEXT,
    "mtDisplayRaw" TEXT,
    "ttDisplayRaw" TEXT,
    "promisedRaw" TEXT NOT NULL,
    "promisedAtNormalized" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastImportBatchId" TEXT,
    "rawSourceData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockerState" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "blockerReason" "BlockerReason" NOT NULL,
    "foremanNotes" TEXT,
    "blockerStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "techPromisedDate" TIMESTAMP(3),
    "dispatcherUserId" TEXT NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactState" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3),
    "customerNotes" TEXT,
    "advisorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "repairOrderId" TEXT,
    "importBatchId" TEXT,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ImportRowError_importBatchId_rowNumber_idx" ON "ImportRowError"("importBatchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_roNumber_key" ON "RepairOrder"("roNumber");

-- CreateIndex
CREATE INDEX "RepairOrder_asmNumber_isActive_idx" ON "RepairOrder"("asmNumber", "isActive");

-- CreateIndex
CREATE INDEX "RepairOrder_mode_isActive_idx" ON "RepairOrder"("mode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlockerState_repairOrderId_key" ON "BlockerState"("repairOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactState_repairOrderId_key" ON "ContactState"("repairOrderId");

-- CreateIndex
CREATE INDEX "ActivityLog_repairOrderId_createdAt_idx" ON "ActivityLog"("repairOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_importBatchId_createdAt_idx" ON "ActivityLog"("importBatchId", "createdAt");

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRowError" ADD CONSTRAINT "ImportRowError_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_lastImportBatchId_fkey" FOREIGN KEY ("lastImportBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockerState" ADD CONSTRAINT "BlockerState_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockerState" ADD CONSTRAINT "BlockerState_dispatcherUserId_fkey" FOREIGN KEY ("dispatcherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactState" ADD CONSTRAINT "ContactState_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactState" ADD CONSTRAINT "ContactState_advisorUserId_fkey" FOREIGN KEY ("advisorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

