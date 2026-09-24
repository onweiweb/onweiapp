-- DropIndex
DROP INDEX "ReviewSurfaceConfig_surface_key";

-- AlterTable
ALTER TABLE "ReviewSurfaceConfig" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSurfaceConfig_surface_productId_key" ON "ReviewSurfaceConfig"("surface", "productId");
