-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('RAZORPAY', 'COD');

-- CreateEnum
CREATE TYPE "OrderDiscountKind" AS ENUM ('INSIDER', 'COUPON');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('RAZORPAY', 'MANUAL');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReturnResolution" AS ENUM ('REFUND', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('CART', 'CATEGORIES', 'PRODUCTS');

-- CreateEnum
CREATE TYPE "CouponAudience" AS ENUM ('EVERYONE', 'FIRST_ORDER', 'INSIDERS', 'SPECIFIC');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DiscountType" ADD VALUE 'TIERED';
ALTER TYPE "DiscountType" ADD VALUE 'FREE_SHIPPING';

-- AlterEnum
ALTER TYPE "OtpChannel" ADD VALUE 'WHATSAPP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReturnStatus" ADD VALUE 'RECEIVED';
ALTER TYPE "ReturnStatus" ADD VALUE 'EXCHANGED';

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_customerId_fkey";

-- DropIndex
DROP INDEX "CouponRedemption_orderId_key";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "guestToken" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "allowedContacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "audience" "CouponAudience" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN     "autoApply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "combinableWithCoupons" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "combinableWithInsider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "excludeSaleItems" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxDiscount" DECIMAL(10,2),
ADD COLUMN     "minItems" INTEGER,
ADD COLUMN     "prepaidOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scope" "CouponScope" NOT NULL DEFAULT 'CART',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CouponRedemption" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "status" "RedemptionStatus" NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "codCollectedAt" TIMESTAMP(3),
ADD COLUMN     "codFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "insiderDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "needsAttention" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY',
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "reservationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingAddressSnapshot" JSONB,
ADD COLUMN     "trackingNumber" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "productName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sku" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "variantLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "warehouseId" TEXT,
ADD COLUMN     "wasOnSale" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "errorReason" TEXT,
ADD COLUMN     "method" TEXT,
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "customerNote" TEXT,
ADD COLUMN     "exchangeNote" TEXT,
ADD COLUMN     "payoutUpi" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "refundAmount" DECIMAL(10,2),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "resolution" "ReturnResolution" NOT NULL DEFAULT 'REFUND',
ADD COLUMN     "restocked" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrderDiscount" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "OrderDiscountKind" NOT NULL,
    "couponId" TEXT,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "freeShipping" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "returnRequestId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "RefundMethod" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "providerRefundId" TEXT,
    "note" TEXT,
    "createdByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "freeShippingThreshold" DECIMAL(10,2) NOT NULL DEFAULT 999,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 99,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codFee" DECIMAL(10,2) NOT NULL DEFAULT 49,
    "codMinOrder" DECIMAL(10,2),
    "codMaxOrder" DECIMAL(10,2) DEFAULT 5000,
    "paymentHoldMinutes" INTEGER NOT NULL DEFAULT 15,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "returnsAllowRefund" BOOLEAN NOT NULL DEFAULT true,
    "returnsAllowExchange" BOOLEAN NOT NULL DEFAULT true,
    "returnSaleItems" BOOLEAN NOT NULL DEFAULT true,
    "returnReasons" TEXT[] DEFAULT ARRAY['Wrong size', 'Damaged or faulty', 'Not as described', 'Changed my mind', 'Other']::TEXT[],
    "returnConditionNote" TEXT NOT NULL DEFAULT 'Unused, with tags attached and in the original packaging.',
    "returnShippingNote" TEXT NOT NULL DEFAULT 'We''ll arrange a pickup from your address.',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByStaffId" TEXT,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderDiscount_orderId_idx" ON "OrderDiscount"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_guestToken_key" ON "Cart"("guestToken");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_status_idx" ON "CouponRedemption"("couponId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_couponId_key" ON "CouponRedemption"("orderId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Order_status_reservationExpiresAt_idx" ON "Order"("status", "reservationExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDiscount" ADD CONSTRAINT "OrderDiscount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

