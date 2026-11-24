import { describe, expect, it } from "vitest";
import {
  addIthinkParcels,
  buildIthinkShipment,
  cancelIthinkParcel,
  explainIthinkRemark,
  findIthinkParcel,
  ithinkDate,
  ithinkPhone,
  ithinkUrl,
  parseIthinkTime,
  readIthinkConfig,
  trackIthinkParcels,
  type IthinkConfig,
  type IthinkParcel,
} from "./ithinkClient";

const config: IthinkConfig = {
  mode: "production",
  accessToken: "token",
  secretKey: "secret",
  pickupAddressId: "11",
  returnAddressId: "12",
  storeId: "",
};

function parcel(reference: string): IthinkParcel {
  return {
    reference,
    orderDate: new Date("2026-11-24T20:00:00Z"),
    name: "Test Person",
    line1: "1 Test Road",
    line2: null,
    city: "Hyderabad",
    state: "Telangana",
    pin: "500032",
    phone: "+919876543210",
    productName: "Onwei Insider card",
    sku: "INSIDER-CARD",
    declaredValue: 1,
    lengthCm: 20.3,
    widthCm: 1,
    heightCm: 15.2,
    weightKg: 0.026,
  };
}

/** A fake fetch that answers with `reply` and keeps what was sent. */
function fakeFetch(
  reply: unknown | ((url: string, body: Record<string, unknown>) => unknown),
) {
  const calls: { url: string; data: Record<string, unknown> }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as {
      data: Record<string, unknown>;
    };
    calls.push({ url, data: body.data });
    const value =
      typeof reply === "function"
        ? (reply as (u: string, b: Record<string, unknown>) => unknown)(
            url,
            body.data,
          )
        : reply;
    return new Response(JSON.stringify(value), { status: 200 });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("readIthinkConfig", () => {
  it("needs the mode, both keys and the pickup id", () => {
    expect(readIthinkConfig({})).toBeNull();
    expect(
      readIthinkConfig({
        ITHINK_ENV: "live",
        ITHINK_ACCESS_TOKEN: "a",
        ITHINK_SECRET_KEY: "b",
        ITHINK_PICKUP_ADDRESS_ID: "1",
      }),
    ).toBeNull();
    expect(
      readIthinkConfig({
        ITHINK_ENV: "staging",
        ITHINK_ACCESS_TOKEN: "a",
        ITHINK_SECRET_KEY: "b",
        ITHINK_PICKUP_ADDRESS_ID: "1",
      }),
    ).toMatchObject({ mode: "staging", returnAddressId: "1", storeId: "" });
  });
});

describe("formats", () => {
  it("uses India dates and 10-digit phones", () => {
    // 20:00 UTC is already the next day in India.
    expect(ithinkDate(new Date("2026-11-24T20:00:00Z"))).toBe("25-11-2026");
    expect(ithinkPhone("+91 98765 43210")).toBe("9876543210");
    expect(parseIthinkTime("2026-11-24 18:11:26")?.toISOString()).toBe(
      "2026-11-24T12:41:26.000Z",
    );
    expect(parseIthinkTime("")).toBeNull();
  });

  it("picks the right host", () => {
    expect(ithinkUrl("staging", "order/track.json")).toContain(
      "pre-alpha.ithinklogistics.com",
    );
    expect(ithinkUrl("production", "order/track.json")).toContain(
      "api.ithinklogistics.com",
    );
    expect(ithinkUrl("production", "order/add.json")).toContain(
      "my.ithinklogistics.com",
    );
  });

  it("sends every field iThink insists on", () => {
    const body = buildIthinkShipment(config, parcel("CARD-0001"));
    for (const key of [
      "gst_number",
      "cod_amount",
      "eway_bill_number",
      "store_id",
      "add2",
    ]) {
      expect(body).toHaveProperty(key);
    }
    expect(body).toMatchObject({
      order: "CARD-0001",
      payment_mode: "Prepaid",
      phone: "9876543210",
      weight: "0.026",
      shipment_length: "20.3",
      return_address_id: "12",
    });
  });
});

describe("addIthinkParcels", () => {
  it("reads booked, refused and duplicate lines", async () => {
    const { impl, calls } = fakeFetch({
      status: "error",
      status_code: 200,
      data: {
        "1": {
          status: "success",
          waybill: 1333110042856,
          refnum: "card-0001",
          logistic_name: "delhivery",
        },
        "2": {
          status: "error",
          remark: "Invalid Pincode",
          refnum: "card-0002",
        },
        "3": {
          status: "error",
          remark: "Duplicate Order no. in system",
          refnum: "card-0003",
        },
      },
    });
    const results = await addIthinkParcels(
      config,
      [parcel("CARD-0001"), parcel("CARD-0002"), parcel("CARD-0003")],
      impl,
    );
    expect(results[0]).toEqual({
      reference: "CARD-0001",
      outcome: "BOOKED",
      awb: "1333110042856",
      courier: "delhivery",
    });
    expect(results[1]).toMatchObject({
      outcome: "REFUSED",
      addressProblem: true,
    });
    expect(results[2]).toEqual({
      reference: "CARD-0003",
      outcome: "DUPLICATE",
    });
    expect(calls[0]?.data).toMatchObject({
      access_token: "token",
      logistics: "",
    });
  });

  it("treats no reply as unknown", async () => {
    const impl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const [result] = await addIthinkParcels(
      config,
      [parcel("CARD-0001")],
      impl,
    );
    expect(result).toMatchObject({ outcome: "UNKNOWN" });
  });

  it("refuses the whole call when iThink rejects the request", async () => {
    const { impl } = fakeFetch({
      status: "error",
      html_message: "Invalid Request Format logistics",
    });
    const [result] = await addIthinkParcels(
      config,
      [parcel("CARD-0001")],
      impl,
    );
    expect(result).toMatchObject({ outcome: "REFUSED", addressProblem: false });
  });

  it("never trusts a line for a different reference", async () => {
    const { impl } = fakeFetch({
      data: { "1": { status: "success", waybill: "9", refnum: "card-9999" } },
    });
    const [result] = await addIthinkParcels(
      config,
      [parcel("CARD-0001")],
      impl,
    );
    expect(result).toMatchObject({ outcome: "UNKNOWN" });
  });
});

describe("explainIthinkRemark", () => {
  it("says what to fix in plain words", () => {
    expect(explainIthinkRemark("Invalid Phone").reason).toContain("10-digit");
    expect(explainIthinkRemark("Wallet balance low")).toEqual({
      reason: "iThink said: Wallet balance low",
      addressProblem: false,
    });
  });
});

describe("trackIthinkParcels", () => {
  it("reads Track Order in tens and skips AWBs it didn't ask for", async () => {
    const awbs = Array.from({ length: 12 }, (_, i) => String(1000 + i));
    const { impl, calls } = fakeFetch(
      (_url: string, data: Record<string, unknown>) => {
        const asked = String(data.awb_number_list).split(",");
        return {
          data: Object.fromEntries(
            [...asked, "901234567109"].map((awb) => [
              awb,
              {
                message: "success",
                awb_no: awb,
                logistic: "Delhivery",
                current_status: "Delivered",
                current_status_code: "DL",
                last_scan_details: { status_date_time: "2026-11-25 10:00:00" },
                order_date_time: { delivery_date: "2026-11-25 10:00:00" },
              },
            ]),
          ),
        };
      },
    );
    const out = await trackIthinkParcels(config, awbs, impl);
    expect(calls).toHaveLength(2);
    expect(out.size).toBe(12);
    expect(out.has("901234567109")).toBe(false);
    expect(out.get("1000")).toMatchObject({
      statusText: "Delivered",
      statusCode: "DL",
    });
  });

  it("uses Order Details on the test server", async () => {
    const { impl, calls } = fakeFetch({
      data: {
        "55": {
          awb_no: "55",
          order: "CARD-0001",
          logistic: "Delhivery",
          latest_courier_status: "delivered",
        },
      },
    });
    const out = await trackIthinkParcels(
      { ...config, mode: "staging" },
      ["55"],
      impl,
    );
    expect(calls[0]?.url).toContain("get_details.json");
    expect(out.get("55")?.statusText).toBe("delivered");
  });
});

describe("findIthinkParcel", () => {
  it("matches our reference whatever the case", async () => {
    const { impl } = fakeFetch({
      data: {
        "1": { awb_no: "1", order: "OTHER" },
        "2": { awb_no: "2", order: "card-0001", logistic: "Delhivery" },
      },
    });
    const hit = await findIthinkParcel(config, "CARD-0001", new Date(), impl);
    expect(hit).toMatchObject({ awb: "2", courier: "Delhivery" });
  });
});

describe("cancelIthinkParcel", () => {
  it("reads success and failure", async () => {
    const ok = fakeFetch({
      status: "success",
      data: [{ status: "success", remark: "Order Cancelled Successfully" }],
    });
    expect(await cancelIthinkParcel(config, "1", ok.impl)).toEqual({
      ok: true,
    });
    const no = fakeFetch({
      status: "error",
      data: [{ status: "error", remark: "Already picked up" }],
    });
    expect(await cancelIthinkParcel(config, "1", no.impl)).toEqual({
      ok: false,
      reason: "iThink said: Already picked up",
    });
  });
});
