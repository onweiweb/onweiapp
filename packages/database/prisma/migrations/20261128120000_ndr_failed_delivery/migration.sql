-- Failed deliveries (iThink "Undelivered"): when, why, and when staff last chose try again or send it back.
ALTER TABLE "Shipment" ADD COLUMN     "failedAttemptAt" TIMESTAMP(3),
ADD COLUMN     "failedReason" TEXT,
ADD COLUMN     "ndrActionAt" TIMESTAMP(3);
