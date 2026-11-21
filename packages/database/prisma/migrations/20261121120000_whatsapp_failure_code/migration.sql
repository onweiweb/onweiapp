-- Error code on each WhatsApp message, for plain reasons in admin and for
-- leaving out numbers that can't get WhatsApp.
ALTER TABLE "WhatsAppMessage" ADD COLUMN "failureCode" TEXT;

CREATE INDEX "WhatsAppMessage_phone_failureCode_idx" ON "WhatsAppMessage"("phone", "failureCode");

-- Fill in codes for failures already logged: "(#131049)" style first, then a
-- leading "131049:", then "Gupshup said 429".
UPDATE "WhatsAppMessage"
SET "failureCode" = COALESCE(
  substring("failureReason" from '\(#([0-9]{3,6})\)'),
  substring("failureReason" from '^\s*([0-9]{3,6})\s*:'),
  substring("failureReason" from 'Gupshup said ([0-9]{3})')
)
WHERE "status" = 'FAILED' AND "failureReason" IS NOT NULL;
