-- AlterEnum
ALTER TYPE "ShipmentKind" ADD VALUE 'ORDER';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "defaultItemWeightKg" DECIMAL(6,3) NOT NULL DEFAULT 0.3,
ADD COLUMN     "parcelHeightCm" DECIMAL(6,1) NOT NULL DEFAULT 5,
ADD COLUMN     "parcelLengthCm" DECIMAL(6,1) NOT NULL DEFAULT 30,
ADD COLUMN     "parcelWidthCm" DECIMAL(6,1) NOT NULL DEFAULT 25;

-- CreateIndex
CREATE INDEX "Shipment_orderId_isCurrent_idx" ON "Shipment"("orderId", "isCurrent");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

