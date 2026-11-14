-- CreateTable
CREATE TABLE "InsiderCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cardNumber" INTEGER NOT NULL,
    "waitlistEntryId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsiderCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsiderCode_code_key" ON "InsiderCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InsiderCode_cardNumber_key" ON "InsiderCode"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InsiderCode_waitlistEntryId_key" ON "InsiderCode"("waitlistEntryId");

-- CreateIndex
CREATE INDEX "InsiderCode_assignedAt_cardNumber_idx" ON "InsiderCode"("assignedAt", "cardNumber");

-- AddForeignKey
ALTER TABLE "InsiderCode" ADD CONSTRAINT "InsiderCode_waitlistEntryId_fkey" FOREIGN KEY ("waitlistEntryId") REFERENCES "WaitlistEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
