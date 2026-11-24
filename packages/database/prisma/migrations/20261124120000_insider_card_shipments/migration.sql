-- CreateEnum
CREATE TYPE "ShipmentKind" AS ENUM ('INSIDER_CARD');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('SENDING', 'BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNING', 'RETURNED', 'LOST', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "InsiderSetting" ADD COLUMN     "cardDeclaredValue" DECIMAL(10,2) NOT NULL DEFAULT 1,
ADD COLUMN     "cardHeightCm" DECIMAL(6,1) NOT NULL DEFAULT 15.2,
ADD COLUMN     "cardLengthCm" DECIMAL(6,1) NOT NULL DEFAULT 20.3,
ADD COLUMN     "cardWeightKg" DECIMAL(6,3) NOT NULL DEFAULT 0.026,
ADD COLUMN     "cardWidthCm" DECIMAL(6,1) NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "kind" "ShipmentKind" NOT NULL,
    "insiderCardAddressId" TEXT,
    "reference" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'SENDING',
    "awb" TEXT,
    "courier" TEXT,
    "courierStatus" TEXT,
    "lastScanAt" TIMESTAMP(3),
    "error" TEXT,
    "addressChangedAt" TIMESTAMP(3),
    "sentByStaffId" TEXT,
    "bookedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_awb_key" ON "Shipment"("awb");

-- CreateIndex
CREATE INDEX "Shipment_insiderCardAddressId_isCurrent_idx" ON "Shipment"("insiderCardAddressId", "isCurrent");

-- CreateIndex
CREATE INDEX "Shipment_status_lastCheckedAt_idx" ON "Shipment"("status", "lastCheckedAt");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_insiderCardAddressId_fkey" FOREIGN KEY ("insiderCardAddressId") REFERENCES "InsiderCardAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

