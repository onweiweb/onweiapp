-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "consentedAt" TIMESTAMP(3),
ADD COLUMN     "ipAddress" TEXT;
