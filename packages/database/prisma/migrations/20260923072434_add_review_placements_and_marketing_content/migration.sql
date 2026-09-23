-- CreateEnum
CREATE TYPE "ReviewSurface" AS ENUM ('HOME_HERO', 'HOME_WALL', 'PRODUCT_WALL');

-- CreateEnum
CREATE TYPE "MarqueePlacement" AS ENUM ('HOME_HERO', 'HOME_SHOWCASE', 'PDP');

-- CreateTable
CREATE TABLE "ReviewPlacement" (
    "id" TEXT NOT NULL,
    "surface" "ReviewSurface" NOT NULL,
    "productId" TEXT,
    "reviewId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSurfaceConfig" (
    "id" TEXT NOT NULL,
    "surface" "ReviewSurface" NOT NULL,
    "limit" INTEGER NOT NULL,

    CONSTRAINT "ReviewSurfaceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueProp" (
    "id" TEXT NOT NULL,
    "illustrationUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ValueProp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPhoto" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InstagramPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarqueeItem" (
    "id" TEXT NOT NULL,
    "placement" "MarqueePlacement" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MarqueeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewPlacement_surface_productId_idx" ON "ReviewPlacement"("surface", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPlacement_surface_productId_reviewId_key" ON "ReviewPlacement"("surface", "productId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSurfaceConfig_surface_key" ON "ReviewSurfaceConfig"("surface");

-- CreateIndex
CREATE INDEX "MarqueeItem_placement_isActive_idx" ON "MarqueeItem"("placement", "isActive");

-- AddForeignKey
ALTER TABLE "ReviewPlacement" ADD CONSTRAINT "ReviewPlacement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewPlacement" ADD CONSTRAINT "ReviewPlacement_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
