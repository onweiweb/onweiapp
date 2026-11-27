import { randomUUID } from "node:crypto";
import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cancelOrderByStaff, OrderActionError } from "../commerce/adminOrders";
import type { IthinkConfig } from "./ithinkClient";
import {
  actOnFailedDelivery,
  checkDeliveryPincode,
  clearPincodeCache,
  getOrderShipment,
  refreshOrderShipments,
  sendOrderToIthink,
} from "./orderShipments";
import { matchTrackingNumbers } from "./trackingMatch";
import { bookReturnPickup, getReturnPickups } from "./returnShipments";
import { handleIthinkWebhook } from "./webhook";
import { importCodRemittances } from "./codRemittance";

// Test orders only (example.test customers), removed afterwards. iThink is
// faked: nothing leaves this machine.
const config: IthinkConfig = {
  mode: "production",
  accessToken: "test",
  secretKey: "test",
  pickupAddressId: "1",
  returnAddressId: "1",
  storeId: "",
};

type Handler = (path: string, data: Record<string, unknown>) => unknown;

function fake(handler: Handler): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    const { data } = JSON.parse(String(init?.body)) as {
      data: Record<string, unknown>;
    };
    const path = new URL(url).pathname.replace("/api_v3/", "");
    return new Response(JSON.stringify(handler(path, data)), { status: 200 });
  }) as unknown as typeof fetch;
}

describe.skipIf(!process.env.DATABASE_URL)(
  "order shipments (integration)",
  { timeout: 30000 },
  () => {
    const orderIds: string[] = [];
    const customerIds: string[] = [];
    let actor: { staffUserId: string };
    let variantId: string;
    let nextAwb = Date.now() * 10 + 7;
    const sent: Record<string, unknown>[] = [];

    const booking = fake((path, data) => {
      if (path !== "order/add.json") return {};
      const shipments = data.shipments as { order: string }[];
      sent.push(...(shipments as unknown as Record<string, unknown>[]));
      return {
        status: "success",
        data: Object.fromEntries(
          shipments.map((s, i) => [
            String(i + 1),
            {
              status: "success",
              waybill: String((nextAwb += 1)),
              refnum: s.order.toLowerCase(),
              logistic_name: "delhivery",
            },
          ]),
        ),
      };
    });

    function track(
      awb: string,
      status: string,
      code: string,
      scan = "2026-11-25 10:00:00",
      reason = "",
    ) {
      return fake((path) =>
        path === "order/track.json"
          ? {
              data: {
                [awb]: {
                  message: "success",
                  awb_no: awb,
                  logistic: "Delhivery",
                  current_status: status,
                  current_status_code: code,
                  last_scan_details: {
                    status_date_time: scan,
                    reason,
                  },
                  order_date_time: {
                    delivery_date: code === "DL" ? "2026-11-27 15:00:00" : "",
                  },
                },
              },
            }
          : {},
      );
    }

    async function makeOrder(input: {
      paymentMethod: "COD" | "RAZORPAY";
      paid?: boolean;
    }): Promise<string> {
      const customer = await prisma.customer.create({
        data: { email: `ship-${randomUUID()}@example.test` },
      });
      customerIds.push(customer.id);
      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: "SHIPPING",
          fullName: "Test Buyer",
          phone: "+919876543210",
          line1: "1 Test Street",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "500032",
          country: "IN",
        },
      });
      const order = await prisma.order.create({
        data: {
          orderNumber: `TSHIP-${randomUUID().slice(0, 8)}`,
          customerId: customer.id,
          status: "CONFIRMED",
          paymentMethod: input.paymentMethod,
          subtotal: 1000,
          shippingTotal: 99,
          codFee: input.paymentMethod === "COD" ? 49 : 0,
          total: input.paymentMethod === "COD" ? 1148 : 1099,
          contactEmail: customer.email,
          shippingAddressId: address.id,
          billingAddressId: address.id,
          shippingAddressSnapshot: {
            fullName: "Test Buyer",
            phone: "+919876543210",
            line1: "1 Test Street",
            line2: null,
            city: "Hyderabad",
            state: "Telangana",
            postalCode: "500032",
            country: "IN",
          },
          items: {
            create: [
              {
                productVariantId: variantId,
                quantity: 1,
                unitPrice: 1000,
                totalAmount: 1000,
                productName: "Test Tee",
                variantLabel: "M",
                sku: "TEST-TEE-M",
              },
              {
                productVariantId: variantId,
                quantity: 1,
                unitPrice: 0,
                totalAmount: 0,
                productName: "Test Gift",
                variantLabel: "",
                sku: "TEST-GIFT",
                isFree: true,
              },
            ],
          },
        },
      });
      if (input.paid) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: "razorpay",
            providerPaymentId: `pay_test_${randomUUID()}`,
            amount: 1099,
            status: "SUCCESS",
          },
        });
      }
      orderIds.push(order.id);
      return order.id;
    }

    const current = (orderId: string) =>
      prisma.shipment.findFirstOrThrow({ where: { orderId, isCurrent: true } });

    beforeAll(async () => {
      actor = {
        staffUserId:
          // The oldest staff member: other test files add and remove their own.
          (
            await prisma.staffUser.findFirstOrThrow({
              orderBy: { createdAt: "asc" },
            })
          ).id,
      };
      variantId = (await prisma.productVariant.findFirstOrThrow()).id;
    });

    afterAll(async () => {
      const shipments = await prisma.shipment.findMany({
        where: { orderId: { in: orderIds } },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityId: { in: [...orderIds, ...shipments.map((s) => s.id)] },
        },
      });
      await prisma.shipment.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderStatusHistory.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.address.deleteMany({
        where: { customerId: { in: customerIds } },
      });
      await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    });

    it("books a cash on delivery order once, then follows the courier to delivered", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      const result = await sendOrderToIthink(id, null, {
        config,
        fetchImpl: booking,
      });
      expect(result).toMatchObject({ ok: true, outcome: "BOOKED" });
      const parcel = sent.at(-1)!;
      expect(parcel).toMatchObject({
        payment_mode: "COD",
        cod_amount: "1148",
        total_amount: "1148",
        shipping_charges: "99",
        cod_charges: "49",
        // The free gift goes as ₹1, balanced in the discount.
        total_discount: "1",
      });
      const booked = await current(id);
      expect(booked.status).toBe("BOOKED");

      expect(
        await sendOrderToIthink(id, actor, { config, fetchImpl: booking }),
      ).toEqual({
        ok: false,
        reason: "ALREADY_SENT",
      });

      const awb = booked.awb!;
      const shipped = await refreshOrderShipments(
        { startedAt: new Date(Date.now() + 1000), orderId: id },
        { config, fetchImpl: track(awb, "In Transit", "UD") },
      );
      expect(shipped).toMatchObject({
        ok: true,
        events: [{ orderId: id, type: "SHIPPED" }],
      });
      const order = await prisma.order.findUniqueOrThrow({ where: { id } });
      expect(order).toMatchObject({
        status: "SHIPPED",
        trackingNumber: awb,
        courierName: "Delhivery",
      });

      const delivered = await refreshOrderShipments(
        { startedAt: new Date(Date.now() + 1000), orderId: id },
        { config, fetchImpl: track(awb, "Delivered", "DL") },
      );
      expect(delivered).toMatchObject({
        events: [{ orderId: id, type: "DELIVERED" }],
      });
      const done = await prisma.order.findUniqueOrThrow({ where: { id } });
      expect(done.status).toBe("DELIVERED");
      expect(done.deliveredAt?.toISOString()).toBe("2026-11-27T09:30:00.000Z");
      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId: id },
        orderBy: { createdAt: "asc" },
      });
      expect(history.map((h) => h.status)).toEqual(["SHIPPED", "DELIVERED"]);
      expect(history.every((h) => h.changedBy === "ithink")).toBe(true);
    });

    it("keeps an order iThink already has from going twice, then takes its tracking number", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      const lost = (async () => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch;
      expect(
        await sendOrderToIthink(id, null, { config, fetchImpl: lost }),
      ).toMatchObject({ ok: true, outcome: "UNSURE" });
      const sending = await current(id);

      // Live iThink: refuses the repeat, Order Details answers null.
      const awb = String((nextAwb += 1));
      const live = fake((path, data) => {
        if (path === "order/add.json") {
          return {
            data: {
              "1": {
                status: "error",
                remark: "Order No. Already Exist.",
                refnum: sending.reference.toLowerCase(),
              },
            },
          };
        }
        if (path === "order/get_details.json") return null;
        if (path === "order/track.json" && data.awb_number_list === awb) {
          return {
            data: {
              [awb]: {
                message: "success",
                awb_no: awb,
                logistic: "Delhivery",
                current_status: "Manifested",
                current_status_code: "UD",
                order_details: { order_number: sending.reference },
              },
            },
          };
        }
        return {};
      });
      const checked = await sendOrderToIthink(id, actor, {
        config,
        fetchImpl: live,
      });
      expect(checked).toMatchObject({ ok: true, outcome: "UNSURE" });
      const again = await sendOrderToIthink(id, actor, {
        config,
        fetchImpl: live,
      });
      expect(again).toMatchObject({ ok: true, outcome: "UNSURE" });
      expect(await prisma.shipment.count({ where: { orderId: id } })).toBe(1);

      // A tracking number for another order is refused.
      const otherId = await makeOrder({ paymentMethod: "COD" });
      const wrong = await matchTrackingNumbers(
        { text: awb, kind: "ORDER", orderId: otherId },
        actor,
        { config, fetchImpl: live },
      );
      expect(wrong).toMatchObject({ ok: true, matched: [] });

      const matched = await matchTrackingNumbers(
        { text: awb, kind: "ORDER", orderId: id },
        actor,
        { config, fetchImpl: live },
      );
      expect(matched).toMatchObject({ ok: true, matched: [{ awb }] });
      expect(await current(id)).toMatchObject({
        id: sending.id,
        status: "BOOKED",
        awb,
      });
    });

    it("jumps straight to delivered when the in-between scans were missed", async () => {
      const id = await makeOrder({ paymentMethod: "RAZORPAY", paid: true });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });
      expect(sent.at(-1)).toMatchObject({
        payment_mode: "Prepaid",
        cod_amount: "0",
      });
      const awb = (await current(id)).awb!;
      await refreshOrderShipments(
        { startedAt: new Date(Date.now() + 1000), orderId: id },
        { config, fetchImpl: track(awb, "Delivered", "DL") },
      );
      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId: id },
        orderBy: { createdAt: "asc" },
      });
      expect(history.map((h) => h.status)).toEqual(["SHIPPED", "DELIVERED"]);
    });

    it("moves an order from iThink's webhook, checking with Track Order first", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });
      const awb = (await current(id)).awb!;

      // The push says delivered, Track Order says only picked up: we follow
      // Track Order, so a forged push can't skip ahead.
      const first = await handleIthinkWebhook([awb, "NOT-OURS-1"], {
        config,
        fetchImpl: track(awb, "In Transit", "UD"),
      });
      expect(first).toMatchObject({
        ok: true,
        matched: 1,
        events: [{ orderId: id, type: "SHIPPED" }],
      });
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe("SHIPPED");

      // The same push again: nothing moves, so no second email.
      const again = await handleIthinkWebhook([awb], {
        config,
        fetchImpl: track(awb, "In Transit", "UD"),
      });
      expect(again).toMatchObject({ ok: true, matched: 1, events: [] });

      const delivered = await handleIthinkWebhook([awb], {
        config,
        fetchImpl: track(awb, "Delivered", "DL"),
      });
      expect(delivered.events).toEqual([{ orderId: id, type: "DELIVERED" }]);
    });

    it("ignores webhook tracking numbers we don't have, and needs the keys", async () => {
      const untouched = fake(() => {
        throw new Error("iThink should not be asked");
      });
      expect(
        await handleIthinkWebhook(["NOT-OURS-2"], {
          config,
          fetchImpl: untouched,
        }),
      ).toEqual({ ok: true, matched: 0, changed: 0, events: [] });

      const id = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });
      const awb = (await current(id)).awb!;
      expect(await handleIthinkWebhook([awb], { config: null })).toMatchObject({
        ok: false,
        matched: 1,
        changed: 0,
      });
    });

    it("flags a failed delivery until staff choose, and tells iThink what they chose", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });
      const awb = (await current(id)).awb!;
      const refresh = (fetchImpl: typeof fetch) =>
        refreshOrderShipments(
          { startedAt: new Date(Date.now() + 1000), orderId: id },
          { config, fetchImpl },
        );
      await refresh(track(awb, "In Transit", "UD"));
      await refresh(
        track(
          awb,
          "Undelivered",
          "UD",
          "2026-11-26 18:00:00",
          "Customer Not Available",
        ),
      );
      const order = await prisma.order.findUniqueOrThrow({ where: { id } });
      expect(order.needsAttention).toBe(
        'The courier couldn\'t deliver (Customer Not Available). Choose "Try again" or "Send it back" on the Delivery card.',
      );
      expect((await getOrderShipment(id))?.failedDelivery?.reason).toBe(
        "Customer Not Available",
      );

      const asked: Record<string, unknown>[] = [];
      const ndr = fake((path, data) => {
        if (path !== "ndr/add-reattempt-rto.json") return {};
        asked.push(data);
        return {
          status: "success",
          data: { [awb]: { status: "success", remark: "" } },
        };
      });
      const result = await actOnFailedDelivery(
        id,
        { kind: "REATTEMPT", date: new Date(Date.now() + 86_400_000) },
        actor,
        { config, fetchImpl: ndr },
      );
      expect(result).toEqual({ ok: true });
      expect(asked[0]).toMatchObject({ awb_numbers: awb, ndr_action: 1 });
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } }))
          .needsAttention,
      ).toBeNull();
      expect((await getOrderShipment(id))?.failedDelivery).toBeNull();

      // The same failed scan again doesn't flag it a second time...
      await refresh(
        track(
          awb,
          "Undelivered",
          "UD",
          "2026-11-26 18:00:00",
          "Customer Not Available",
        ),
      );
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } }))
          .needsAttention,
      ).toBeNull();
      // ...and once it's out for delivery, the failure is cleared.
      await refresh(
        track(awb, "Out For Delivery", "UD", "2026-11-27 09:00:00"),
      );
      expect((await current(id)).failedAttemptAt).toBeNull();
    });

    it("books a return pickup once, and follows it to picked up", async () => {
      const id = await makeOrder({ paymentMethod: "RAZORPAY", paid: true });
      const item = await prisma.orderItem.findFirstOrThrow({
        where: { orderId: id, isFree: false },
      });
      const ret = await prisma.returnRequest.create({
        data: {
          orderId: id,
          orderItemId: item.id,
          reason: "Too small",
          status: "REQUESTED",
          quantity: 1,
          resolution: "REFUND",
          refundAmount: 1000,
        },
      });
      // Not approved yet: no pickup.
      expect(
        await bookReturnPickup(ret.id, actor, { config, fetchImpl: booking }),
      ).toMatchObject({ ok: false });
      await prisma.returnRequest.update({
        where: { id: ret.id },
        data: { status: "APPROVED" },
      });
      const booked = await bookReturnPickup(ret.id, actor, {
        config,
        fetchImpl: booking,
      });
      expect(booked).toMatchObject({ ok: true });
      expect(sent.at(-1)).toMatchObject({
        order_type: "reverse",
        payment_mode: "Prepaid",
        cod_amount: "0",
        total_amount: "1000",
      });
      expect(String(sent.at(-1)?.order)).toMatch(/-R1$/);
      // A second press books nothing.
      expect(
        await bookReturnPickup(ret.id, actor, { config, fetchImpl: booking }),
      ).toMatchObject({ ok: false });

      const awb = (await getReturnPickups([ret.id])).get(ret.id)!.awb!;
      const result = await handleIthinkWebhook([awb], {
        config,
        fetchImpl: track(awb, "REV Picked Up", "UD"),
      });
      expect(result).toMatchObject({ ok: true, matched: 1, changed: 1 });
      expect(
        (
          await prisma.returnRequest.findUniqueOrThrow({
            where: { id: ret.id },
          })
        ).status,
      ).toBe("PICKED_UP");
      const pickupRows = await prisma.shipment.findMany({
        where: { returnRequestId: ret.id },
        select: { id: true },
      });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: pickupRows.map((r) => r.id) } },
      });
      await prisma.shipment.deleteMany({ where: { returnRequestId: ret.id } });
      await prisma.returnRequest.delete({ where: { id: ret.id } });
    });

    it("marks cash on delivery orders paid out from iThink's payouts, once", async () => {
      const good = await makeOrder({ paymentMethod: "COD" });
      const short = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(good, null, { config, fetchImpl: booking });
      await sendOrderToIthink(short, null, { config, fetchImpl: booking });
      const awbGood = (await current(good)).awb!;
      const awbShort = (await current(short)).awb!;
      const payoutId = `TEST-PAYOUT-${Date.now()}`;
      const payouts = fake((path) => {
        if (path === "remittance/get.json") {
          return {
            status: "success",
            data: [
              {
                remittance_id: payoutId,
                remittance_date: "2026-11-25",
                cod_generated: "2296",
                cod_remitted: "2200",
              },
            ],
          };
        }
        if (path === "remittance/get_details.json") {
          return {
            status: "success",
            data: [
              { airway_bill_no: awbGood, price: "1148" },
              { airway_bill_no: awbShort, price: "1000" },
              { airway_bill_no: "NOT-OURS", price: "10" },
            ],
          };
        }
        return {};
      });
      const deps = { config, fetchImpl: payouts };
      const first = await importCodRemittances(actor, { days: 1 }, deps);
      expect(first).toMatchObject({
        ok: true,
        payouts: 1,
        matched: 2,
        mismatched: 1,
        unknown: 1,
      });
      const [a, b] = await Promise.all([
        prisma.order.findUniqueOrThrow({ where: { id: good } }),
        prisma.order.findUniqueOrThrow({ where: { id: short } }),
      ]);
      expect(a.codRemittanceId).not.toBeNull();
      expect(a.needsAttention).toBeNull();
      expect(b.needsAttention).toContain("iThink paid ₹1,000");
      // Pressing again changes nothing.
      const second = await importCodRemittances(actor, { days: 1 }, deps);
      expect(second).toMatchObject({ payouts: 1, matched: 0 });

      await prisma.order.updateMany({
        where: { id: { in: [good, short] } },
        data: { codRemittanceId: null },
      });
      await prisma.codRemittance.deleteMany({
        where: { remittanceId: payoutId },
      });
      await prisma.auditLog.deleteMany({
        where: {
          action: "cod.remittance.import",
          staffUserId: actor.staffUserId,
          entityId: "1d",
        },
      });
    });

    it("flags an order coming back", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });
      const awb = (await current(id)).awb!;
      await refreshOrderShipments(
        { startedAt: new Date(Date.now() + 1000), orderId: id },
        { config, fetchImpl: track(awb, "RTO In Transit", "RT") },
      );
      const order = await prisma.order.findUniqueOrThrow({ where: { id } });
      expect(order.needsAttention).toContain("sending it back");
      expect((await current(id)).status).toBe("RETURNING");
    });

    it("cancels the courier booking with the order, and keeps the order if iThink says no", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      await sendOrderToIthink(id, null, { config, fetchImpl: booking });

      const refuse = fake(() => ({
        status: "error",
        data: [{ status: "error", remark: "Already picked up" }],
      }));
      await expect(
        cancelOrderByStaff(id, "Customer asked", actor, null, {
          config,
          fetchImpl: refuse,
        }),
      ).rejects.toBeInstanceOf(OrderActionError);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe("CONFIRMED");

      const accept = fake(() => ({
        status: "success",
        data: [{ status: "success" }],
      }));
      await cancelOrderByStaff(id, "Customer asked", actor, null, {
        config,
        fetchImpl: accept,
      });
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id } })).status,
      ).toBe("CANCELLED");
      expect((await current(id)).status).toBe("CANCELLED");
    });

    it("only sends confirmed orders and needs the keys", async () => {
      const id = await makeOrder({ paymentMethod: "COD" });
      await prisma.order.update({ where: { id }, data: { status: "PENDING" } });
      expect(
        await sendOrderToIthink(id, null, { config, fetchImpl: booking }),
      ).toEqual({
        ok: false,
        reason: "NOT_READY",
      });
      expect(await sendOrderToIthink(id, null, { config: null })).toEqual({
        ok: false,
        reason: "NOT_SET_UP",
      });
    });

    it("checks a PIN once and remembers it", async () => {
      clearPincodeCache();
      let calls = 0;
      const pins = fake(() => {
        calls += 1;
        return {
          status: "success",
          data: { "744301": { delhivery: { prepaid: "N", cod: "N" } } },
        };
      });
      const deps = { config, fetchImpl: pins };
      expect(await checkDeliveryPincode("744301", deps)).toEqual({
        deliverable: false,
        cod: false,
        city: null,
        state: null,
      });
      await checkDeliveryPincode("744301", deps);
      expect(calls).toBe(1);
      expect(await checkDeliveryPincode("12345", deps)).toBeNull();
      expect(await checkDeliveryPincode("500032", { config: null })).toBeNull();
      clearPincodeCache();
    });
  },
);
