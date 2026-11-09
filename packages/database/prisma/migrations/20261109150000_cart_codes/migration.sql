-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "applyInsider" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "couponCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

