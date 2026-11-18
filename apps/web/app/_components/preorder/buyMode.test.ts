import type { PreorderPublicStatus } from "@onwei/core";
import { describe, expect, it } from "vitest";
import { buyModeFor } from "./usePreorderStatus";

function status(
  state: PreorderPublicStatus["state"],
  productIds: string[] = ["p1"],
): PreorderPublicStatus {
  return {
    state,
    live: state === "PREORDER_OPEN",
    reserveAmount: 90000,
    productIds,
    tiers: [],
    liveIndex: -1,
    day: 0,
    totalDays: 0,
    endsAt: null,
    opensAt: null,
    expectedShipDate: null,
  };
}

describe("buyModeFor", () => {
  it("waits until the status has loaded", () => {
    expect(buyModeFor(null, "p1")).toBe("LOADING");
  });

  it("is the normal shop when the site is live", () => {
    expect(buyModeFor(status("LIVE", []), "p1")).toBe("SHOP");
  });

  it("reserves campaign products and holds the rest for launch", () => {
    expect(buyModeFor(status("PREORDER_OPEN"), "p1")).toBe("RESERVE");
    expect(buyModeFor(status("PREORDER_OPEN"), "p2")).toBe("LAUNCH");
  });

  it("never offers the bag in pre-order mode, even with no lap running", () => {
    expect(buyModeFor(status("PREORDER_CLOSED", []), "p1")).toBe("LAUNCH");
    expect(buyModeFor(status("PREORDER_CLOSED"), "p1")).toBe("CLOSED");
    expect(buyModeFor(status("PREORDER_SOON"), "p1")).toBe("SOON");
  });
});
