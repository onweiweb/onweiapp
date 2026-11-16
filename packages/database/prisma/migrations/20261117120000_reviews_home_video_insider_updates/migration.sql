-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "homeVideoDesktopUrl" TEXT,
ADD COLUMN     "homeVideoMobileUrl" TEXT,
ADD COLUMN     "moversCount" INTEGER;

-- CreateTable
CREATE TABLE "InsiderUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "InsiderUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsiderUpdate_isActive_sortOrder_idx" ON "InsiderUpdate"("isActive", "sortOrder");

