-- CreateEnum
CREATE TYPE "SiteMode" AS ENUM ('WAITLIST', 'PREORDERS', 'LIVE');

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteMode" "SiteMode" NOT NULL DEFAULT 'WAITLIST',
    "launchAt" TIMESTAMP(3) NOT NULL,
    "allowInternationalPhone" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByStaffId" TEXT,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "movementFlex" INTEGER,
    "source" TEXT,
    "consentVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_phone_key" ON "WaitlistEntry"("phone");

-- CreateIndex
CREATE INDEX "WaitlistEntry_submittedAt_idx" ON "WaitlistEntry"("submittedAt");
