-- AlterTable
ALTER TABLE "InventoryLog" ADD COLUMN     "productVariantId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryLog_productVariantId_createdAt_idx" ON "InventoryLog"("productVariantId", "createdAt");

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
