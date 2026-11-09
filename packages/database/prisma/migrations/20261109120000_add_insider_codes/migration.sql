-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "codeEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN     "codeEmailedAt" TIMESTAMP(3),
ADD COLUMN     "insiderCode" TEXT;

-- CreateTable
CREATE TABLE "InsiderSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultPercent" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByStaffId" TEXT,

    CONSTRAINT "InsiderSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsiderTier" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "percent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsiderTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsiderCardAddress" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "InsiderCardAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsiderTier_startsAt_idx" ON "InsiderTier"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "InsiderCardAddress_waitlistEntryId_key" ON "InsiderCardAddress"("waitlistEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_insiderCode_key" ON "WaitlistEntry"("insiderCode");

-- AddForeignKey
ALTER TABLE "InsiderCardAddress" ADD CONSTRAINT "InsiderCardAddress_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

