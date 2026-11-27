-- COD money from iThink: payouts (Get Remittance) and which payout paid each cash on delivery order.
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "codRemittanceId" TEXT,
ADD COLUMN     "codRemittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CodRemittance" (
    "id" TEXT NOT NULL,
    "remittanceId" TEXT NOT NULL,
    "remittanceDate" TIMESTAMP(3) NOT NULL,
    "codGenerated" DECIMAL(12,2) NOT NULL,
    "billAdjusted" DECIMAL(12,2) NOT NULL,
    "refundAdjusted" DECIMAL(12,2) NOT NULL,
    "transactionCharges" DECIMAL(12,2) NOT NULL,
    "gstCharges" DECIMAL(12,2) NOT NULL,
    "walletAmount" DECIMAL(12,2) NOT NULL,
    "advanceHold" DECIMAL(12,2) NOT NULL,
    "codRemitted" DECIMAL(12,2) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodRemittance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodRemittance_remittanceId_key" ON "CodRemittance"("remittanceId");

-- CreateIndex
CREATE INDEX "CodRemittance_remittanceDate_idx" ON "CodRemittance"("remittanceDate");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_codRemittanceId_fkey" FOREIGN KEY ("codRemittanceId") REFERENCES "CodRemittance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

