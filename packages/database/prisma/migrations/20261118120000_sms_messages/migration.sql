-- CreateEnum
CREATE TYPE "SmsPurpose" AS ENUM ('SIGN_IN_CODE');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "purpose" "SmsPurpose" NOT NULL,
    "phone" TEXT NOT NULL,
    "customerId" TEXT,
    "providerRequestId" TEXT,
    "status" "SmsStatus" NOT NULL DEFAULT 'SENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsMessage_providerRequestId_key" ON "SmsMessage"("providerRequestId");

-- CreateIndex
CREATE INDEX "SmsMessage_purpose_createdAt_idx" ON "SmsMessage"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_status_idx" ON "SmsMessage"("status");

-- CreateIndex
CREATE INDEX "SmsMessage_customerId_idx" ON "SmsMessage"("customerId");

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

