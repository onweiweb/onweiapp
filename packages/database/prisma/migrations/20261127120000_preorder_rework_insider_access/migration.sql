-- Pre-order rework (reserve from bag total, balance nudge) and invite-only Insiders with invite rewards; cash refunds keep the gateway fee. Additive only.
-- CreateEnum
CREATE TYPE "InsiderJoinStatus" AS ENUM ('APPROVED', 'APPLIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InsiderJoinMode" AS ENUM ('OPEN', 'INVITE_OR_APPLY');

-- CreateEnum
CREATE TYPE "InsiderRewardType" AS ENUM ('AMOUNT_OFF', 'PERCENT_OFF', 'FREE_ITEM');

-- AlterTable
ALTER TABLE "InsiderSetting" ADD COLUMN     "joinMode" "InsiderJoinMode" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "balanceNudgedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PreorderCampaign" ADD COLUMN     "balanceDueDaysAfterClose" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "nudgeDaysBeforeClose" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "reserveHigh" DECIMAL(10,2) NOT NULL DEFAULT 900,
ADD COLUMN     "reserveLow" DECIMAL(10,2) NOT NULL DEFAULT 500,
ADD COLUMN     "reserveThreshold" DECIMAL(10,2) NOT NULL DEFAULT 4000;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "refundKeepsGatewayFee" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "activity" TEXT,
ADD COLUMN     "gearWish" TEXT,
ADD COLUMN     "invitedByEntryId" TEXT,
ADD COLUMN     "joinReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByStaffId" TEXT,
ADD COLUMN     "sessionPick" TEXT,
ADD COLUMN     "status" "InsiderJoinStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "InsiderRewardRule" (
    "id" TEXT NOT NULL,
    "invites" INTEGER NOT NULL,
    "rewardType" "InsiderRewardType" NOT NULL,
    "value" DECIMAL(10,2),
    "freeVariantId" TEXT,
    "validDays" INTEGER NOT NULL DEFAULT 90,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsiderRewardRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsiderRewardGrant" (
    "id" TEXT NOT NULL,
    "waitlistEntryId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "couponId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsiderRewardGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsiderRewardGrant_waitlistEntryId_ruleId_key" ON "InsiderRewardGrant"("waitlistEntryId", "ruleId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_submittedAt_idx" ON "WaitlistEntry"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_invitedByEntryId_idx" ON "WaitlistEntry"("invitedByEntryId");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_invitedByEntryId_fkey" FOREIGN KEY ("invitedByEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsiderRewardGrant" ADD CONSTRAINT "InsiderRewardGrant_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsiderRewardGrant" ADD CONSTRAINT "InsiderRewardGrant_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "InsiderRewardRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

