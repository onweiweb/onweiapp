import { describe, expect, it } from "vitest";
import {
  canMoveShipment,
  clearsFailedDelivery,
  isFailedDelivery,
  mapIthinkStatus,
} from "./shipmentStatus";

describe("mapIthinkStatus", () => {
  it("maps iThink's words", () => {
    expect(mapIthinkStatus("Manifested", "UD")).toBe("BOOKED");
    expect(mapIthinkStatus("Picked Up", "UD")).toBe("IN_TRANSIT");
    expect(mapIthinkStatus("Undelivered", "UD")).toBe("IN_TRANSIT");
    expect(mapIthinkStatus("Out For Delivery", "UD")).toBe("OUT_FOR_DELIVERY");
    expect(mapIthinkStatus("Delivered", "DL")).toBe("DELIVERED");
    expect(mapIthinkStatus("delivered")).toBe("DELIVERED");
    expect(mapIthinkStatus("RTO In Transit", "RT")).toBe("RETURNING");
    expect(mapIthinkStatus("RTO Delivered", "DL")).toBe("RETURNED");
    expect(mapIthinkStatus("RTO Shortage")).toBe("LOST");
    expect(mapIthinkStatus("Lost")).toBe("LOST");
    expect(mapIthinkStatus("Cancelled", "CN")).toBe("CANCELLED");
  });

  it("leaves unknown words alone", () => {
    expect(mapIthinkStatus("Something new", "UD")).toBeNull();
    expect(mapIthinkStatus("Something new", "DL")).toBe("DELIVERED");
  });
});

describe("canMoveShipment", () => {
  it("moves forward and can skip steps", () => {
    expect(canMoveShipment("BOOKED", "IN_TRANSIT")).toBe(true);
    expect(canMoveShipment("BOOKED", "DELIVERED")).toBe(true);
    expect(canMoveShipment("OUT_FOR_DELIVERY", "IN_TRANSIT")).toBe(false);
  });

  it("never leaves a final status", () => {
    expect(canMoveShipment("DELIVERED", "RETURNING")).toBe(false);
    expect(canMoveShipment("CANCELLED", "BOOKED")).toBe(false);
  });

  it("cancels only before pickup and can come back", () => {
    expect(canMoveShipment("BOOKED", "CANCELLED")).toBe(true);
    expect(canMoveShipment("IN_TRANSIT", "CANCELLED")).toBe(false);
    expect(canMoveShipment("IN_TRANSIT", "RETURNING")).toBe(true);
    expect(canMoveShipment("RETURNING", "RETURNED")).toBe(true);
    expect(canMoveShipment("RETURNING", "DELIVERED")).toBe(false);
  });
});

describe("failed deliveries", () => {
  it("knows a failed attempt, and what settles it", () => {
    expect(isFailedDelivery("Undelivered")).toBe(true);
    expect(isFailedDelivery("out of  delivery area")).toBe(true);
    expect(isFailedDelivery("In Transit")).toBe(false);
    expect(clearsFailedDelivery("OUT_FOR_DELIVERY")).toBe(true);
    expect(clearsFailedDelivery("DELIVERED")).toBe(true);
    expect(clearsFailedDelivery("IN_TRANSIT")).toBe(false);
    expect(clearsFailedDelivery(null)).toBe(false);
  });
});

describe("return pickups", () => {
  it("maps iThink's REV statuses", () => {
    expect(mapIthinkStatus("REV Manifest", "UD")).toBe("BOOKED");
    expect(mapIthinkStatus("REV Out for Pick Up", "UD")).toBe("BOOKED");
    expect(mapIthinkStatus("REV Picked Up", "UD")).toBe("IN_TRANSIT");
    expect(mapIthinkStatus("REV In Transit", "UD")).toBe("IN_TRANSIT");
    expect(mapIthinkStatus("REV Delivered", "DL")).toBe("DELIVERED");
    expect(mapIthinkStatus("REV Cancelled", "UD")).toBe("CANCELLED");
    expect(mapIthinkStatus("REV Something New", "UD")).toBeNull();
  });
});
