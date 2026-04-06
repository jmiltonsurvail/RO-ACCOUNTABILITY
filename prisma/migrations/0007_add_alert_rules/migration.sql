CREATE TYPE "AlertTrigger" AS ENUM (
    'OVERDUE',
    'CONTACT_SLA_BREACHED',
    'BLOCKED_AGING',
    'RENTAL_CAR',
    'HIGH_REPAIR_VALUE'
);

CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "trigger" "AlertTrigger" NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlertRule_trigger_key" ON "AlertRule"("trigger");

INSERT INTO "AlertRule" ("id", "trigger", "name", "enabled", "createdAt", "updatedAt")
VALUES
    ('alert-rule-overdue', 'OVERDUE', 'Overdue RO', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('alert-rule-contact-sla', 'CONTACT_SLA_BREACHED', 'Contact SLA Breached', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('alert-rule-blocked-aging', 'BLOCKED_AGING', 'Blocked Aging Threshold', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('alert-rule-rental-car', 'RENTAL_CAR', 'Rental Car Exposure', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('alert-rule-high-value', 'HIGH_REPAIR_VALUE', 'High Repair Value', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
