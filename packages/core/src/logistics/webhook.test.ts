import { describe, expect, it } from "vitest";
import { ITHINK_WEBHOOK_MAX, parseIthinkWebhook } from "./webhook";

const sample = {
  awb_number: "AWB001",
  latest_scan_time: "2022-04-04 15:20:25",
  current_tracking_status: "2",
  status: "picked up",
  remark: "picked",
  location: "mumbai",
  edd_date: "2022-04-10 15:20:25",
};

describe("parseIthinkWebhook", () => {
  it("reads iThink's sample push", () => {
    expect(parseIthinkWebhook(sample)).toEqual(["AWB001"]);
  });

  it("reads a list, trims and drops repeats", () => {
    expect(
      parseIthinkWebhook([
        { awb_number: " 123 " },
        { awb_number: 123 },
        { awb_number: "456" },
      ]),
    ).toEqual(["123", "456"]);
  });

  it("ignores anything without a usable tracking number", () => {
    expect(parseIthinkWebhook(null)).toEqual([]);
    expect(parseIthinkWebhook("AWB001")).toEqual([]);
    expect(parseIthinkWebhook({})).toEqual([]);
    expect(parseIthinkWebhook({ awb_number: "" })).toEqual([]);
    expect(parseIthinkWebhook({ awb_number: { x: 1 } })).toEqual([]);
    expect(parseIthinkWebhook({ awb_number: "x".repeat(65) })).toEqual([]);
  });

  it("takes at most the limit from one push", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      awb_number: `A${i}`,
    }));
    expect(parseIthinkWebhook(many)).toHaveLength(ITHINK_WEBHOOK_MAX);
  });
});
