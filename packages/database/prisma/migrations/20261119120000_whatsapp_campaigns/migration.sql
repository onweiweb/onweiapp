-- AlterEnum
ALTER TYPE "WhatsAppPurpose" ADD VALUE 'CAMPAIGN';

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "templateName" TEXT;

-- CreateTable
CREATE TABLE "WhatsAppCampaign" (
    "id" TEXT NOT NULL,
    "gupshupTemplateId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "bodyText" TEXT NOT NULL DEFAULT '',
    "fill" JSONB NOT NULL,
    "headerImageUrl" TEXT,
    "audienceLabel" TEXT NOT NULL,
    "plannedCount" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppCampaign_createdAt_idx" ON "WhatsAppCampaign"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_campaignId_status_idx" ON "WhatsAppMessage"("campaignId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_templateName_idx" ON "WhatsAppMessage"("templateName");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsAppCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

