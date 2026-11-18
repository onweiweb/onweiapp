-- CreateEnum
CREATE TYPE "OrderKind" AS ENUM ('STANDARD', 'PREORDER');

-- CreateEnum
CREATE TYPE "CouponOrderKind" AS ENUM ('ORDERS', 'PREORDERS', 'BOTH');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('STANDARD', 'CREDIT');

-- CreateEnum
CREATE TYPE "InsiderStackMode" AS ENUM ('ADD', 'BEST');

-- AlterEnum
ALTER TYPE "DiscountType" ADD VALUE 'FREE_ITEM';

-- AlterEnum
ALTER TYPE "OrderDiscountKind" ADD VALUE 'PREORDER';

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "appliesTo" "CouponOrderKind" NOT NULL DEFAULT 'ORDERS',
ADD COLUMN     "kind" "CouponKind" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "InsiderSetting" ADD COLUMN     "stackMode" "InsiderStackMode" NOT NULL DEFAULT 'ADD';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "balanceDue" DECIMAL(10,2),
ADD COLUMN     "balancePaidAt" TIMESTAMP(3),
ADD COLUMN     "balanceRazorpayOrderId" TEXT,
ADD COLUMN     "balanceRemindedAt" TIMESTAMP(3),
ADD COLUMN     "balanceReminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "balanceRequestedAt" TIMESTAMP(3),
ADD COLUMN     "creditCouponId" TEXT,
ADD COLUMN     "kind" "OrderKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "preorderCampaignId" TEXT,
ADD COLUMN     "preorderTierLabel" TEXT,
ADD COLUMN     "reserveTotal" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "freeReason" TEXT,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "giftOnly" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PreorderCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "reserveAmount" DECIMAL(10,2) NOT NULL DEFAULT 900,
    "expectedShipDate" TIMESTAMP(3),
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "insiderGiftVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreorderCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreorderTier" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "giftVariantId" TEXT,
    "giftLabel" TEXT,

    CONSTRAINT "PreorderTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreorderTier_campaignId_position_key" ON "PreorderTier"("campaignId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Order_balanceRazorpayOrderId_key" ON "Order"("balanceRazorpayOrderId");

-- CreateIndex
CREATE INDEX "Order_kind_status_idx" ON "Order"("kind", "status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_preorderCampaignId_fkey" FOREIGN KEY ("preorderCampaignId") REFERENCES "PreorderCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreorderTier" ADD CONSTRAINT "PreorderTier_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PreorderCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

