-- Return pickups through iThink: a RETURN shipment kind linked to the return it collects.
ALTER TYPE "ShipmentKind" ADD VALUE 'RETURN';

ALTER TABLE "Shipment" ADD COLUMN     "returnRequestId" TEXT;

CREATE INDEX "Shipment_returnRequestId_isCurrent_idx" ON "Shipment"("returnRequestId", "isCurrent");

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
