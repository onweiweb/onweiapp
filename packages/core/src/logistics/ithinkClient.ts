/**
 * iThink Logistics API v3 (https://docs.ithinklogistics.com/). Every call is
 * a POST with JSON `{ data: { ..., access_token, secret_key } }`. Problems
 * come back as HTTP 200 with `status: "error"` and a message, per parcel in
 * `data["1"].remark` or for the whole call in `html_message`.
 *
 * Learned on the test server (2026-11-24), not in the docs:
 * - Add Order needs every optional field present, even as "" (a missing one
 *   is refused as "Invalid Request Format - <field>"), and `logistics`
 *   present (empty lets iThink choose the courier).
 * - The reference (`order`) comes back lowercased in `refnum`, and a
 *   reference iThink already has is refused as "Duplicate Order no." (the
 *   live server says "Order No. Already Exist.").
 * - `waybill` comes back as a number.
 * - On the test server Track Order and Cancel return canned sample data, so
 *   test mode reads status from Order Details instead.
 *
 * Learned on the live server (2026-11-26):
 * - Order Details answers `null` for every request (date range, AWB list or
 *   order number), so a booking can't be found by our reference there. Track
 *   Order works and returns our reference as `order_details.order_number`,
 *   so a booking whose reply was lost is matched from its tracking number
 *   (staff copy it from the iThink portal).
 * The keys are never logged.
 */

import { placeFromCouriers, type IndianState } from "../geo/pincodePlace";

export const ITHINK_ENV_NAMES = [
  "ITHINK_ENV",
  "ITHINK_ACCESS_TOKEN",
  "ITHINK_SECRET_KEY",
  "ITHINK_PICKUP_ADDRESS_ID",
] as const;

export type IthinkMode = "staging" | "production";

export interface IthinkConfig {
  mode: IthinkMode;
  accessToken: string;
  secretKey: string;
  pickupAddressId: string;
  returnAddressId: string;
  storeId: string;
}

const TIMEOUT_MS = 20_000;

export function readIthinkConfig(
  env: Record<string, string | undefined> = process.env,
): IthinkConfig | null {
  const mode = env.ITHINK_ENV?.trim();
  const accessToken = env.ITHINK_ACCESS_TOKEN?.trim();
  const secretKey = env.ITHINK_SECRET_KEY?.trim();
  const pickupAddressId = env.ITHINK_PICKUP_ADDRESS_ID?.trim();
  if (mode !== "staging" && mode !== "production") return null;
  if (!accessToken || !secretKey || !pickupAddressId) return null;
  return {
    mode,
    accessToken,
    secretKey,
    pickupAddressId,
    returnAddressId: env.ITHINK_RETURN_ADDRESS_ID?.trim() || pickupAddressId,
    storeId: env.ITHINK_STORE_ID?.trim() ?? "",
  };
}

export function ithinkUrl(mode: IthinkMode, path: string): string {
  if (mode === "staging") {
    return `https://pre-alpha.ithinklogistics.com/api_v3/${path}`;
  }
  const host =
    path === "order/track.json"
      ? "api.ithinklogistics.com"
      : "my.ithinklogistics.com";
  return `https://${host}/api_v3/${path}`;
}

/** The customer-facing tracking page iThink links to. */
export function ithinkTrackingUrl(awb: string): string {
  return `https://ithinklogistics.co.in/postship/tracking/${encodeURIComponent(awb)}`;
}

type CallResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; reason: "TIMEOUT" | "NETWORK" | "BAD_REPLY" };

async function call(
  config: IthinkConfig,
  path: string,
  data: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<CallResult> {
  let response: Response;
  try {
    response = await fetchImpl(ithinkUrl(config.mode, path), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          ...data,
          access_token: config.accessToken,
          secret_key: config.secretKey,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, reason: timedOut ? "TIMEOUT" : "NETWORK" };
  }
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object")
      return { ok: false, reason: "BAD_REPLY" };
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "BAD_REPLY" };
  }
}

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** iThink wants money and sizes as plain strings. */
function num(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

/** "dd-mm-yyyy" in India time, the format iThink's own examples use. */
export function ithinkDate(value: Date): string {
  const ist = new Date(value.getTime() + 330 * 60_000);
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${ist.getUTCFullYear()}`;
}

/** "yyyy-mm-dd" in India time, for the Order Details date range. */
function ymd(value: Date): string {
  const ist = new Date(value.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 10);
}

/** iThink times are India time, "yyyy-mm-dd hh:mm:ss". */
export function parseIthinkTime(value: unknown): Date | null {
  const text = str(value);
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (!match) return null;
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+05:30`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ten digits, the way iThink wants an Indian mobile number. */
export function ithinkPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export interface IthinkProduct {
  name: string;
  sku: string;
  quantity: number;
  /** Rupees per item. iThink refuses 0, so free items go as 1. */
  price: number;
  taxRate?: number | null;
  hsn?: string | null;
}

export interface IthinkParcel {
  reference: string;
  orderDate: Date;
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pin: string;
  phone: string;
  email?: string;
  products: IthinkProduct[];
  /** What the parcel is worth, rupees (the order total for an order). */
  totalAmount: number;
  paymentMode: "Prepaid" | "COD";
  /** Cash the courier collects, rupees. 0 when prepaid. */
  codAmount?: number;
  shippingCharges?: number;
  codCharges?: number;
  totalDiscount?: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  /** "reverse": a return pickup from this address back to our warehouse. */
  orderType?: "forward" | "reverse";
}

/** One Add Order shipment, with every field iThink insists on. */
export function buildIthinkShipment(
  config: IthinkConfig,
  parcel: IthinkParcel,
): Record<string, unknown> {
  const phone = ithinkPhone(parcel.phone);
  const address = {
    name: parcel.name,
    add: parcel.line1,
    add2: parcel.line2 ?? "",
    add3: "",
    pin: parcel.pin,
    city: parcel.city,
    state: parcel.state,
    country: "India",
    phone,
  };
  const cod = parcel.paymentMode === "COD";
  return {
    waybill: "",
    order: parcel.reference,
    sub_order: "",
    order_date: ithinkDate(parcel.orderDate),
    total_amount: num(parcel.totalAmount, 2),
    ...address,
    company_name: "",
    alt_phone: "",
    email: parcel.email ?? "",
    is_billing_same_as_shipping: "yes",
    billing_name: address.name,
    billing_company_name: "",
    billing_add: address.add,
    billing_add2: address.add2,
    billing_add3: "",
    billing_pin: address.pin,
    billing_city: address.city,
    billing_state: address.state,
    billing_country: "India",
    billing_phone: phone,
    billing_alt_phone: "",
    billing_email: "",
    products: parcel.products.map((p) => ({
      product_name: p.name,
      product_sku: p.sku,
      product_quantity: String(p.quantity),
      product_price: num(Math.max(p.price, 1), 2),
      product_tax_rate: p.taxRate == null ? "" : num(p.taxRate, 2),
      product_hsn_code: p.hsn ?? "",
      product_discount: "0",
    })),
    shipment_length: num(parcel.lengthCm, 1),
    shipment_width: num(parcel.widthCm, 1),
    shipment_height: num(parcel.heightCm, 1),
    weight: num(parcel.weightKg, 3),
    shipping_charges: num(parcel.shippingCharges ?? 0, 2),
    giftwrap_charges: "0",
    transaction_charges: "0",
    total_discount: num(parcel.totalDiscount ?? 0, 2),
    first_attemp_discount: "0",
    cod_charges: num(parcel.codCharges ?? 0, 2),
    advance_amount: "0",
    cod_amount: cod ? num(parcel.codAmount ?? 0, 2) : "0",
    payment_mode: cod ? "COD" : "Prepaid",
    reseller_name: "",
    eway_bill_number: "",
    gst_number: "",
    what3words: "",
    api_source: "1",
    store_id: config.storeId,
    return_address_id: config.returnAddressId,
    pickup_address_id: config.pickupAddressId,
    // Only on return pickups; forward parcels are sent exactly as before.
    ...(parcel.orderType === "reverse" ? { order_type: "reverse" } : {}),
  };
}

export type AddParcelResult =
  | {
      reference: string;
      outcome: "BOOKED";
      awb: string;
      courier: string | null;
    }
  // iThink already has this reference. `awb` when its reply says which.
  | { reference: string; outcome: "DUPLICATE"; awb: string | null }
  | {
      reference: string;
      outcome: "REFUSED";
      reason: string;
      addressProblem: boolean;
    }
  // No usable reply: iThink may or may not have it. Sending the same
  // reference again is safe (a repeat is refused as a duplicate).
  | { reference: string; outcome: "UNKNOWN"; reason: string };

const NO_REPLY: Record<"TIMEOUT" | "NETWORK" | "BAD_REPLY", string> = {
  TIMEOUT: "iThink took too long to answer.",
  NETWORK: "Couldn't reach iThink.",
  BAD_REPLY: "iThink sent back something we couldn't read.",
};

/**
 * Whether iThink refused a parcel because it already has that reference:
 * "Duplicate Order no. in system" (test server), "Order No. Already Exist."
 * (live). Also matches our own saved error for such a refusal.
 */
export function isDuplicateRemark(remark: string): boolean {
  const lower = remark.toLowerCase();
  return (
    lower.includes("duplicate") ||
    /already\s+exist/.test(lower) ||
    lower.includes("already has")
  );
}

/** iThink's remark in plain words, and whether it's about the address. */
export function explainIthinkRemark(remark: string): {
  reason: string;
  addressProblem: boolean;
} {
  const text = remark.trim();
  const lower = text.toLowerCase();
  if (lower.includes("pincode") || lower.includes("pin code")) {
    return {
      reason:
        "iThink can't deliver to this PIN code. Check it with the member.",
      addressProblem: true,
    };
  }
  if (lower.includes("phone") || lower.includes("mobile")) {
    return {
      reason: "The phone number isn't a valid 10-digit mobile number.",
      addressProblem: true,
    };
  }
  if (/\b(address|add|city|state|name)\b/.test(lower)) {
    return {
      reason: `iThink didn't accept the address: ${text}`,
      addressProblem: true,
    };
  }
  return {
    reason: text
      ? `iThink said: ${text}`
      : "iThink didn't accept it and gave no reason.",
    addressProblem: false,
  };
}

/** Add Order, up to 10 parcels per call. Results follow the input order. */
export async function addIthinkParcels(
  config: IthinkConfig,
  parcels: IthinkParcel[],
  fetchImpl: typeof fetch = fetch,
): Promise<AddParcelResult[]> {
  if (parcels.length === 0) return [];
  if (parcels.length > 10)
    throw new Error("iThink takes at most 10 parcels per call");
  const result = await call(
    config,
    "order/add.json",
    {
      shipments: parcels.map((parcel) => buildIthinkShipment(config, parcel)),
      pickup_address_id: config.pickupAddressId,
      logistics: "",
      s_type: "",
      order_type: "",
    },
    fetchImpl,
  );
  if (!result.ok) {
    return parcels.map((p) => ({
      reference: p.reference,
      outcome: "UNKNOWN" as const,
      reason: NO_REPLY[result.reason],
    }));
  }
  const data = record(result.body.data);
  const whole = str(result.body.html_message);
  return parcels.map((parcel, index) => {
    const line = record(data[String(index + 1)]);
    const reference = parcel.reference;
    if (Object.keys(line).length === 0) {
      if (str(result.body.status).toLowerCase() === "error" && whole) {
        if (isDuplicateRemark(whole)) {
          // One message for the whole call: with several parcels we can't
          // tell which one iThink already has.
          return parcels.length === 1
            ? { reference, outcome: "DUPLICATE" as const, awb: null }
            : {
                reference,
                outcome: "UNKNOWN" as const,
                reason: NO_REPLY.BAD_REPLY,
              };
        }
        const explained = explainIthinkRemark(whole);
        return { reference, outcome: "REFUSED" as const, ...explained };
      }
      return {
        reference,
        outcome: "UNKNOWN" as const,
        reason: NO_REPLY.BAD_REPLY,
      };
    }
    // Lines carry their own reference; a mismatch means we can't trust
    // which parcel this is, so treat it as unknown and look it up later.
    const refnum = str(line.refnum);
    if (refnum && refnum.toLowerCase() !== reference.toLowerCase()) {
      return {
        reference,
        outcome: "UNKNOWN" as const,
        reason: NO_REPLY.BAD_REPLY,
      };
    }
    const awb = str(line.waybill);
    if (str(line.status).toLowerCase() === "success" && awb) {
      return {
        reference,
        outcome: "BOOKED" as const,
        awb,
        courier: str(line.logistic_name) || null,
      };
    }
    const remark = str(line.remark);
    if (isDuplicateRemark(remark)) {
      return { reference, outcome: "DUPLICATE" as const, awb: awb || null };
    }
    return {
      reference,
      outcome: "REFUSED" as const,
      ...explainIthinkRemark(remark),
    };
  });
}

export interface IthinkOrderInfo {
  awb: string;
  reference: string;
  courier: string | null;
  statusText: string;
  statusCode: string;
  lastScanAt: Date | null;
  deliveredAt: Date | null;
  /** The courier's reason on the last scan, e.g. why it couldn't deliver. */
  reason: string | null;
}

function fromDetails(row: Record<string, unknown>): IthinkOrderInfo | null {
  const awb = str(row.awb_no);
  if (!awb) return null;
  return {
    awb,
    reference: str(row.order),
    courier: str(row.logistic) || null,
    statusText: str(row.latest_courier_status),
    statusCode: "",
    lastScanAt: parseIthinkTime(row.last_scan_datetime),
    deliveredAt: null,
    reason: null,
  };
}

/**
 * Order Details for a date range (orders by order date), 50 per page.
 * With AWBs given, only those (at most 25 per call).
 */
async function orderDetails(
  config: IthinkConfig,
  input: { from: Date; to: Date; awbs?: string[]; page?: number },
  fetchImpl: typeof fetch,
): Promise<IthinkOrderInfo[] | null> {
  const result = await call(
    config,
    "order/get_details.json",
    {
      awb_number_list: (input.awbs ?? []).join(","),
      start_date: ymd(input.from),
      end_date: ymd(input.to),
      ...(input.page ? { current_page: String(input.page) } : {}),
    },
    fetchImpl,
  );
  if (!result.ok) return null;
  const data = result.body.data;
  if (!data || typeof data !== "object") return [];
  return Object.values(data as Record<string, unknown>)
    .map((row) => fromDetails(record(row)))
    .filter((row): row is IthinkOrderInfo => row !== null);
}

/**
 * Finds a parcel by our reference, for when iThink has it but its reply
 * never reached us. Looks at orders dated a day either side of `around`.
 */
export async function findIthinkParcel(
  config: IthinkConfig,
  reference: string,
  around: Date,
  fetchImpl: typeof fetch = fetch,
): Promise<IthinkOrderInfo | null> {
  const DAY = 24 * 60 * 60_000;
  const from = new Date(around.getTime() - DAY);
  const to = new Date(around.getTime() + DAY);
  const wanted = reference.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const rows = await orderDetails(config, { from, to, page }, fetchImpl);
    if (!rows || rows.length === 0) return null;
    const hit = rows.find((row) => row.reference.toLowerCase() === wanted);
    if (hit) return hit;
    if (rows.length < 50) return null;
  }
  return null;
}

/**
 * Latest courier status for each AWB. Live: Track Order, 10 per call.
 * Test server: Order Details, because its Track Order is canned.
 * AWBs iThink didn't answer for are left out.
 */
export async function trackIthinkParcels(
  config: IthinkConfig,
  awbs: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, IthinkOrderInfo>> {
  const out = new Map<string, IthinkOrderInfo>();
  if (config.mode === "staging") {
    const now = new Date();
    const from = new Date(now.getTime() - 89 * 24 * 60 * 60_000);
    for (let i = 0; i < awbs.length; i += 25) {
      const rows = await orderDetails(
        config,
        { from, to: now, awbs: awbs.slice(i, i + 25) },
        fetchImpl,
      );
      for (const row of rows ?? []) out.set(row.awb, row);
    }
    return out;
  }
  for (let i = 0; i < awbs.length; i += 10) {
    const chunk = awbs.slice(i, i + 10);
    const result = await call(
      config,
      "order/track.json",
      { awb_number_list: chunk.join(",") },
      fetchImpl,
    );
    if (!result.ok) continue;
    const data = record(result.body.data);
    for (const [key, value] of Object.entries(data)) {
      const row = record(value);
      const awb = str(row.awb_no) || key;
      if (!chunk.includes(awb)) continue;
      if (str(row.message) && str(row.message).toLowerCase() !== "success")
        continue;
      const last = record(row.last_scan_details);
      const dates = record(row.order_date_time);
      const orderInfo = record(row.order_details);
      out.set(awb, {
        awb,
        reference: str(orderInfo.order_number),
        courier: str(row.logistic) || null,
        statusText: str(row.current_status) || str(last.status),
        statusCode: str(row.current_status_code) || str(last.status_code),
        lastScanAt: parseIthinkTime(last.status_date_time),
        deliveredAt: parseIthinkTime(dates.delivery_date),
        reason: str(last.reason) || str(last.remark) || null,
      });
    }
  }
  return out;
}

export type CancelResult = { ok: true } | { ok: false; reason: string };

/** Cancels one booked parcel by its AWB. */
export async function cancelIthinkParcel(
  config: IthinkConfig,
  awb: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CancelResult> {
  const result = await call(
    config,
    "order/cancel.json",
    { awb_numbers: awb },
    fetchImpl,
  );
  if (!result.ok) return { ok: false, reason: NO_REPLY[result.reason] };
  const lines = Array.isArray(result.body.data)
    ? (result.body.data as unknown[]).map(record)
    : Object.values(record(result.body.data)).map(record);
  const line = lines[0] ?? {};
  if (
    str(result.body.status).toLowerCase() === "success" &&
    (lines.length === 0 || str(line.status).toLowerCase() === "success")
  ) {
    return { ok: true };
  }
  const remark = str(line.remark) || str(result.body.html_message);
  return {
    ok: false,
    reason: remark
      ? `iThink said: ${remark}`
      : "iThink didn't cancel it and gave no reason.",
  };
}

export interface PincodeService {
  /** Some courier delivers here (prepaid). */
  deliverable: boolean;
  /** Some courier collects cash on delivery here. */
  cod: boolean;
  /** City and state for the PIN when iThink's couriers say (address autofill). */
  city: string | null;
  state: IndianState | null;
}

/** Can iThink's couriers deliver to this PIN? Null when iThink didn't answer. */
export async function checkIthinkPincode(
  config: IthinkConfig,
  pin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PincodeService | null> {
  const result = await call(
    config,
    "pincode/check.json",
    { pincode: pin },
    fetchImpl,
  );
  if (!result.ok) return null;
  if (str(result.body.status).toLowerCase() !== "success") return null;
  const byCourier = Object.fromEntries(
    Object.entries(record(record(result.body.data)[pin]))
      // Only courier entries (objects); ignore anything else iThink adds.
      .filter(([, v]) => v !== null && typeof v === "object")
      .map(([k, v]) => [k.toLowerCase(), record(v)]),
  );
  const couriers = Object.values(byCourier);
  const place = placeFromCouriers(byCourier);
  if (couriers.length === 0) {
    return { deliverable: false, cod: false, ...place };
  }
  const yes = (v: unknown) => str(v).toUpperCase() === "Y";
  return {
    deliverable: couriers.some((c) => yes(c.prepaid) || yes(c.cod)),
    cod: couriers.some((c) => yes(c.cod)),
    ...place,
  };
}

export type FailedDeliveryAction =
  | {
      kind: "REATTEMPT";
      /** Day to try again, India time. */
      date: Date;
      /** A new phone or address for the courier, if the customer gave one. */
      phone?: string;
      address?: string;
    }
  | { kind: "RTO"; remark: string };

/** The NDR request body for one failed delivery (exported for tests). */
export function ndrRequest(
  awb: string,
  action: FailedDeliveryAction,
): Record<string, unknown> {
  if (action.kind === "RTO") {
    return { awb_numbers: awb, ndr_action: 2, rto_remark: action.remark };
  }
  return {
    awb_numbers: awb,
    ndr_action: 1,
    reattempt_date: ymd(action.date),
    reattempt_time: "10:00:00",
    reattempt_mobile_number: action.phone ? ithinkPhone(action.phone) : "",
    reattempt_address: action.address?.trim() ?? "",
    reattempt_address_type: 1,
  };
}

/**
 * After a failed delivery: ask the courier to try again (on a day, with an
 * optional new phone or address) or to send the parcel back to us (RTO).
 */
export async function ndrIthinkAction(
  config: IthinkConfig,
  awb: string,
  action: FailedDeliveryAction,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const result = await call(
    config,
    "ndr/add-reattempt-rto.json",
    ndrRequest(awb, action),
    fetchImpl,
  );
  if (!result.ok) {
    return {
      ok: false,
      reason: "iThink didn't answer. Try again in a minute.",
    };
  }
  const line = record(record(result.body.data)[awb]);
  const status = (str(line.status) || str(result.body.status)).toLowerCase();
  if (status === "success") return { ok: true };
  const remark = str(line.remark) || str(result.body.html_message);
  return {
    ok: false,
    reason: remark
      ? `iThink said: ${remark}`
      : "iThink didn't accept it and gave no reason.",
  };
}
