CREATE TABLE "SlaSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "blockedAgingHours" INTEGER NOT NULL DEFAULT 8,
    "contactSlaHours" INTEGER NOT NULL DEFAULT 2,
    "dueSoonHours" INTEGER NOT NULL DEFAULT 12,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SlaSettings" (
    "id",
    "blockedAgingHours",
    "contactSlaHours",
    "dueSoonHours",
    "createdAt",
    "updatedAt"
)
VALUES (
    'default',
    8,
    2,
    12,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
