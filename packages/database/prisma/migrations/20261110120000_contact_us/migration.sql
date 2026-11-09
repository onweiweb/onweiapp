-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'REPLIED');

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "contactAddress" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),
    "repliedByStaffId" TEXT,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");


-- Starting contact details from the Contact Us Figma frame (owner confirmed
-- they are real, 2026-11-09). Editable in admin Settings.
UPDATE "SiteSetting"
SET "contactAddress" = E'235, Binnamangala, 13th Cross Road, Indiranagar\nBengaluru, Bengaluru Urban\nKarnataka 560038',
    "contactPhone" = '+91 7760487004',
    "contactEmail" = 'support@onwei.in'
WHERE "id" = 'singleton' AND "contactAddress" IS NULL;
