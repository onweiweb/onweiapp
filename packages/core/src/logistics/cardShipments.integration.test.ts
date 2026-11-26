import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  saveCardAddress,
  setCardPosted,
  updateCardAddressByStaff,
} from "../insiders/cardAddress";
import {
  cancelCardShipment,
  keepCardShipment,
  refreshCardShipments,
  sendInsiderCards,
} from "./cardShipments";
import type { IthinkConfig } from "./ithinkClient";
import { matchTrackingNumbers } from "./trackingMatch";
import { handleIthinkWebhook } from "./webhook";

// Test rows only (fake names, example.test emails), removed afterwards.
// iThink is faked: nothing leaves this machine.
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

const failing = (async () => {
  throw new TypeError("fetch failed");
}) as unknown as typeof fetch;

describe.skipIf(!process.env.DATABASE_URL)(
  "insider card shipments (integration)",
  { timeout: 30000 },
  () => {
    const tag = `ship-test-${Date.now()}`;
    const entryIds: string[] = [];
    const cardIds: string[] = [];
    let actor: { staffUserId: string };
    let nextCard = -2_000_000 - Math.floor(Math.random() * 100_000) * 10;
    let nextAwb = Date.now() * 10;

    async function makeMember(postalCode = "500032"): Promise<string> {
      const entry = await prisma.waitlistEntry.create({
        data: {
          fullName: "Test Insider",
          email: `${tag}-${crypto.randomUUID()}@example.test`,
          phone: `+9198${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
          consentVersion: "test",
          submittedAt: new Date("2001-01-01T00:00:00Z"),
        },
      });
      entryIds.push(entry.id);
      nextCard -= 1;
      const card = await prisma.insiderCode.create({
        data: {
          code: `${tag}-${nextCard}`,
          cardNumber: nextCard,
          waitlistEntryId: entry.id,
          assignedAt: new Date(),
        },
      });
      cardIds.push(card.id);
      const saved = await saveCardAddress(entry.id, {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "14 Test Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode,
      });
      expect(saved).toEqual({ ok: true });
      const address = await prisma.insiderCardAddress.findUniqueOrThrow({
        where: { waitlistEntryId: entry.id },
      });
      return address.id;
    }

    function current(addressId: string) {
      return prisma.shipment.findFirstOrThrow({
        where: { insiderCardAddressId: addressId, isCurrent: true },
      });
    }

    /** Books every parcel unless its PIN is 999999. */
    const booking = fake((path, data) => {
      if (path !== "order/add.json") return {};
      const shipments = data.shipments as { order: string; pin: string }[];
      return {
        status: "success",
        data: Object.fromEntries(
          shipments.map((s, i) => [
            String(i + 1),
            s.pin === "999999"
              ? {
                  status: "error",
                  remark: "Invalid Pincode",
                  refnum: s.order.toLowerCase(),
                }
              : {
                  status: "success",
                  waybill: String((nextAwb += 1)),
                  refnum: s.order.toLowerCase(),
                  logistic_name: "delhivery",
                },
          ]),
        ),
      };
    });

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
    });

    afterAll(async () => {
      await prisma.insiderCode.deleteMany({ where: { id: { in: cardIds } } });
      // Addresses and shipments go with the entries (cascade).
      await prisma.waitlistEntry.deleteMany({
        where: { id: { in: entryIds } },
      });
    });

    it("books a card once, flags a changed address, and tracks it", async () => {
      const id = await makeMember();
      const sent = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      expect(sent).toMatchObject({ ok: true, booked: 1, failed: 0 });
      const booked = await current(id);
      expect(booked).toMatchObject({ status: "BOOKED", courier: "delhivery" });
      expect(booked.reference).toMatch(/^CARD-T\d+$/);

      // Already on its way: a second press sends nothing.
      const again = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      expect(again).toMatchObject({ ok: true, booked: 0, skipped: 1 });
      expect(
        await prisma.shipment.count({ where: { insiderCardAddressId: id } }),
      ).toBe(1);

      // Can't be posted by hand while iThink has it.
      expect(await setCardPosted(id, true, actor)).toEqual({
        ok: false,
        reason: "SHIPPING",
      });

      // The member edits the address: flagged until staff decide.
      await saveCardAddress(entryIds.at(-1) as string, {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "15 Other Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500032",
      });
      expect((await current(id)).addressChangedAt).not.toBeNull();
      expect(await keepCardShipment(id, actor)).toEqual({ ok: true });
      expect((await current(id)).addressChangedAt).toBeNull();

      const awb = booked.awb as string;
      const track = (status: string, code: string) =>
        fake((path) =>
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
                      status_date_time: "2026-11-25 10:00:00",
                    },
                    order_date_time: {
                      delivery_date: code === "DL" ? "2026-11-26 12:00:00" : "",
                    },
                  },
                },
              }
            : {},
        );

      // iThink's webhook: only this card is asked about.
      const first = await handleIthinkWebhook([awb], {
        config,
        fetchImpl: track("In Transit", "UD"),
      });
      expect(first).toMatchObject({ ok: true, matched: 1, changed: 1 });
      expect((await current(id)).status).toBe("IN_TRANSIT");
      const address = await prisma.insiderCardAddress.findUniqueOrThrow({
        where: { id },
      });
      expect(address.postedAt?.toISOString()).toBe("2026-11-25T04:30:00.000Z");

      // Checked once per press: the same press doesn't ask twice.
      const pressStart = new Date();
      await refreshCardShipments(
        { startedAt: pressStart, max: 100 },
        { config, fetchImpl: track("Delivered", "DL") },
      );
      const delivered = await current(id);
      expect(delivered.status).toBe("DELIVERED");
      expect(delivered.deliveredAt?.toISOString()).toBe(
        "2026-11-26T06:30:00.000Z",
      );

      // A late, older update never moves it back.
      await refreshCardShipments(
        { startedAt: new Date(Date.now() + 1000), max: 100 },
        { config, fetchImpl: track("In Transit", "UD") },
      );
      expect((await current(id)).status).toBe("DELIVERED");
    });

    it("keeps a refused card for a fix, then sends it as a new attempt", async () => {
      const id = await makeMember("999999");
      const sent = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      expect(sent).toMatchObject({ ok: true, booked: 0, failed: 1 });
      const failed = await current(id);
      expect(failed.status).toBe("FAILED");
      expect(failed.error).toContain("PIN code");

      await saveCardAddress(entryIds.at(-1) as string, {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "14 Test Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500033",
      });
      const retry = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      expect(retry).toMatchObject({ booked: 1 });
      const now = await current(id);
      expect(now.reference).toBe(`${failed.reference}-2`);
      expect(
        await prisma.shipment.count({ where: { insiderCardAddressId: id } }),
      ).toBe(2);
    });

    it("re-sends the same reference after no reply and picks up the booking", async () => {
      const id = await makeMember();
      const lost = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: failing,
      });
      expect(lost).toMatchObject({ booked: 0, unsure: 1 });
      const sending = await current(id);
      expect(sending.status).toBe("SENDING");

      // iThink did get it the first time: it refuses the repeat, and the
      // lookup finds the parcel by our reference.
      const awb = String((nextAwb += 1));
      const duplicate = fake((path) => {
        if (path === "order/add.json") {
          return {
            data: {
              "1": {
                status: "error",
                remark: "Duplicate Order no. in system",
                refnum: sending.reference.toLowerCase(),
              },
            },
          };
        }
        if (path === "order/get_details.json") {
          return {
            data: {
              [awb]: {
                awb_no: awb,
                order: sending.reference,
                logistic: "Delhivery",
              },
            },
          };
        }
        return {};
      });
      const checked = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: duplicate,
      });
      expect(checked).toMatchObject({ booked: 1 });
      const booked = await current(id);
      expect(booked).toMatchObject({ id: sending.id, status: "BOOKED", awb });
    });

    /**
     * The live server (2026-11-26): Order Details answers null, a repeat is
     * refused as "Order No. Already Exist.", and Track Order gives our
     * reference back as order_details.order_number.
     */
    function liveIthink(booked: Map<string, string>): typeof fetch {
      return fake((path, data) => {
        if (path === "order/add.json") {
          const shipments = data.shipments as { order: string }[];
          return {
            status: "success",
            data: Object.fromEntries(
              shipments.map((s, i) => [
                String(i + 1),
                booked.has(s.order)
                  ? {
                      status: "error",
                      remark: "Order No. Already Exist.",
                      refnum: s.order.toLowerCase(),
                    }
                  : {
                      status: "success",
                      waybill: String((nextAwb += 1)),
                      refnum: s.order.toLowerCase(),
                    },
              ]),
            ),
          };
        }
        if (path === "order/get_details.json") return null;
        if (path === "order/track.json") {
          const asked = String(data.awb_number_list).split(",");
          const byAwb = new Map([...booked].map(([ref, awb]) => [awb, ref]));
          return {
            status: "success",
            data: Object.fromEntries(
              asked
                .filter((awb) => byAwb.has(awb))
                .map((awb) => [
                  awb,
                  {
                    message: "success",
                    awb_no: awb,
                    logistic: "Delhivery",
                    current_status: "Manifested",
                    current_status_code: "UD",
                    order_details: { order_number: byAwb.get(awb) },
                  },
                ]),
            ),
          };
        }
        return {};
      });
    }

    it("never sends a card iThink already has as a new attempt, and matches its tracking number", async () => {
      const id = await makeMember();
      // First send: iThink books it, but the reply is lost.
      await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: failing,
      });
      const sending = await current(id);
      const awb = String((nextAwb += 1));
      const live = liveIthink(new Map([[sending.reference, awb]]));

      // "Check again": refused as a duplicate, lookup finds nothing live.
      const checked = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: live,
      });
      expect(checked).toMatchObject({ booked: 0, failed: 0, unsure: 1 });
      const stuck = await current(id);
      expect(stuck).toMatchObject({ id: sending.id, status: "SENDING" });
      expect(stuck.error).toContain("tracking number");

      // Pressing send again does nothing new.
      const again = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: live,
      });
      expect(again).toMatchObject({ booked: 0, skipped: 1 });
      expect(
        await prisma.shipment.count({ where: { insiderCardAddressId: id } }),
      ).toBe(1);

      // Staff paste the tracking number from the portal.
      const matched = await matchTrackingNumbers(
        { text: `${sending.reference}  ${awb}  Today`, kind: "INSIDER_CARD" },
        actor,
        { config, fetchImpl: live },
      );
      expect(matched).toMatchObject({
        ok: true,
        matched: [{ reference: sending.reference, awb }],
        left: [],
      });
      expect(await current(id)).toMatchObject({
        id: sending.id,
        status: "BOOKED",
        awb,
        courier: "Delhivery",
        error: null,
      });
      expect(
        await prisma.auditLog.count({
          where: {
            entityId: sending.id,
            action: "shipment.trackingNumber.add",
          },
        }),
      ).toBe(1);

      // The same paste again changes nothing.
      const twice = await matchTrackingNumbers(
        { text: awb, kind: "INSIDER_CARD" },
        actor,
        { config, fetchImpl: live },
      );
      expect(twice).toMatchObject({ ok: true, matched: [], alreadySaved: 1 });
    });

    it("fixes cards marked not sent before the fix (refused as Already Exist)", async () => {
      const id = await makeMember();
      const ref = `CARD-T${Date.now()}`;
      const old = await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: id,
          reference: ref,
          status: "FAILED",
          error: "iThink said: Order No. Already Exist.",
        },
      });
      const awb = String((nextAwb += 1));
      const live = liveIthink(new Map([[ref, awb]]));

      const sent = await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: live,
      });
      expect(sent).toMatchObject({ booked: 0, skipped: 1 });
      expect(
        await prisma.shipment.count({ where: { insiderCardAddressId: id } }),
      ).toBe(1);

      // Scoped to another card: refused.
      const other = await makeMember();
      const wrong = await matchTrackingNumbers(
        { text: awb, kind: "INSIDER_CARD", insiderCardAddressId: other },
        actor,
        { config, fetchImpl: live },
      );
      expect(wrong).toMatchObject({ ok: true, matched: [] });
      if (wrong.ok) expect(wrong.left[0]?.reason).toContain("not this card");

      const fixed = await matchTrackingNumbers(
        { text: awb, kind: "INSIDER_CARD", insiderCardAddressId: id },
        actor,
        { config, fetchImpl: live },
      );
      expect(fixed).toMatchObject({ ok: true, matched: [{ awb }] });
      expect(await current(id)).toMatchObject({
        id: old.id,
        status: "BOOKED",
        awb,
      });
    });

    it("takes an older try that was booked after all, and flags two live bookings", async () => {
      const id = await makeMember();
      const base = `CARD-T${Date.now()}`;
      const first = await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: id,
          reference: base,
          status: "FAILED",
          isCurrent: false,
          error: "iThink took too long to answer.",
        },
      });
      const second = await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: id,
          reference: `${base}-2`,
          status: "FAILED",
          error: "iThink said: Order No. Already Exist.",
        },
      });
      const awb1 = String((nextAwb += 1));
      const awb2 = String((nextAwb += 1));
      const live = liveIthink(
        new Map([
          [base, awb1],
          [`${base}-2`, awb2],
        ]),
      );
      // Both tries are booked on iThink: the newest is taken, the older
      // one is listed so staff cancel it in the portal.
      const result = await matchTrackingNumbers(
        { text: `${awb2}\n${awb1}`, kind: "INSIDER_CARD" },
        actor,
        { config, fetchImpl: live },
      );
      expect(result).toMatchObject({
        ok: true,
        matched: [{ reference: `${base}-2`, awb: awb2 }],
      });
      if (result.ok) {
        expect(result.left).toHaveLength(1);
        expect(result.left[0]?.reason).toContain("both on iThink");
      }
      expect(await current(id)).toMatchObject({ id: second.id, awb: awb2 });
      expect(
        await prisma.shipment.findUniqueOrThrow({ where: { id: first.id } }),
      ).toMatchObject({ status: "FAILED", awb: null, isCurrent: false });
    });

    it("switches to an older try when the newer one really failed", async () => {
      const id = await makeMember();
      const base = `CARD-T${Date.now()}`;
      const first = await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: id,
          reference: base,
          status: "FAILED",
          isCurrent: false,
          error: "iThink took too long to answer.",
        },
      });
      await prisma.shipment.create({
        data: {
          kind: "INSIDER_CARD",
          insiderCardAddressId: id,
          reference: `${base}-2`,
          status: "FAILED",
          error: "iThink can't deliver to this PIN code.",
        },
      });
      const awb = String((nextAwb += 1));
      const result = await matchTrackingNumbers(
        { text: awb, kind: "INSIDER_CARD" },
        actor,
        { config, fetchImpl: liveIthink(new Map([[base, awb]])) },
      );
      expect(result).toMatchObject({ ok: true, matched: [{ awb }] });
      expect(await current(id)).toMatchObject({
        id: first.id,
        status: "BOOKED",
        awb,
      });
      expect(
        await prisma.shipment.count({
          where: { insiderCardAddressId: id, isCurrent: true },
        }),
      ).toBe(1);
    });

    it("sends one card per iThink call, so one refusal can't sink the rest", async () => {
      const ids = [await makeMember(), await makeMember(), await makeMember()];
      const calls: number[] = [];
      const counting = fake((path, data) => {
        if (path !== "order/add.json") return {};
        const shipments = data.shipments as { order: string }[];
        calls.push(shipments.length);
        return {
          data: {
            "1": {
              status: "success",
              waybill: String((nextAwb += 1)),
              refnum: shipments[0]?.order.toLowerCase(),
            },
          },
        };
      });
      const sent = await sendInsiderCards({ addressIds: ids }, actor, {
        config,
        fetchImpl: counting,
      });
      expect(sent).toMatchObject({ booked: 3 });
      expect(calls).toEqual([1, 1, 1]);
    });

    it("cancels a booked card before pickup", async () => {
      const id = await makeMember();
      await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      const cancelOk = fake(() => ({
        status: "success",
        data: [{ status: "success" }],
      }));
      expect(
        await cancelCardShipment(id, actor, { config, fetchImpl: cancelOk }),
      ).toEqual({
        ok: true,
      });
      expect((await current(id)).status).toBe("CANCELLED");
      // Nothing left to cancel.
      expect(
        await cancelCardShipment(id, actor, { config, fetchImpl: cancelOk }),
      ).toEqual({
        ok: false,
        reason: "NOT_CANCELLABLE",
      });
      // Cancelled cards can be posted by hand.
      expect(await setCardPosted(id, true, actor)).toEqual({ ok: true });
    });

    it("lets staff fix a refused address and send it again", async () => {
      const id = await makeMember("999999");
      await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      expect((await current(id)).status).toBe("FAILED");
      const fixed = {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "14 Test Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500032",
      };

      expect(
        await updateCardAddressByStaff(
          id,
          { ...fixed, postalCode: "12" },
          true,
          actor,
          { config, fetchImpl: booking },
        ),
      ).toEqual({
        ok: false,
        reason: "INVALID_FIELDS",
        fields: ["postalCode"],
      });

      expect(
        await updateCardAddressByStaff(id, fixed, true, actor, {
          config,
          fetchImpl: booking,
        }),
      ).toEqual({ ok: true, outcome: "SENT" });
      const now = await current(id);
      expect(now.status).toBe("BOOKED");
      expect(now.reference).toMatch(/-2$/);
      const log = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: id, action: "insider.address.update" },
      });
      // Which fields changed, never the address itself.
      expect(log.afterState).toEqual({ changedFields: ["postalCode"] });
      await prisma.auditLog.deleteMany({ where: { entityId: id } });
    });

    it("cancels the old booking when staff change a booked address, or keeps it if iThink says no", async () => {
      const id = await makeMember();
      await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: booking,
      });
      const moved = {
        fullName: "Test Insider",
        phone: "9876543210",
        line1: "99 New Road",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500032",
      };
      const refuse = fake((path) =>
        path === "order/cancel.json"
          ? {
              status: "error",
              data: [{ status: "error", remark: "Picked up" }],
            }
          : {},
      );
      expect(
        await updateCardAddressByStaff(id, moved, true, actor, {
          config,
          fetchImpl: refuse,
        }),
      ).toMatchObject({ ok: true, outcome: "NOT_SENT_CANCEL_REFUSED" });
      // Saved, still booked, and still flagged for a look.
      const kept = await current(id);
      expect(kept.status).toBe("BOOKED");
      expect(kept.addressChangedAt).not.toBeNull();
      expect(
        (await prisma.insiderCardAddress.findUniqueOrThrow({ where: { id } }))
          .line1,
      ).toBe("99 New Road");

      const both: typeof fetch = (async (url: string, init?: RequestInit) =>
        String(url).includes("cancel")
          ? new Response(
              JSON.stringify({
                status: "success",
                data: [{ status: "success" }],
              }),
            )
          : booking(url, init)) as unknown as typeof fetch;
      expect(
        await updateCardAddressByStaff(
          id,
          { ...moved, line1: "100 New Road" },
          true,
          actor,
          { config, fetchImpl: both },
        ),
      ).toEqual({ ok: true, outcome: "SENT" });
      const rebooked = await current(id);
      expect(rebooked.status).toBe("BOOKED");
      expect(rebooked.addressChangedAt).toBeNull();
      expect(rebooked.reference).toMatch(/-2$/);
      await prisma.auditLog.deleteMany({ where: { entityId: id } });
    }, 120000); // Two address changes and a resend: many slow dev DB round trips.

    it("won't change an address while iThink hasn't replied", async () => {
      const id = await makeMember();
      await sendInsiderCards({ addressIds: [id] }, actor, {
        config,
        fetchImpl: failing,
      });
      expect((await current(id)).status).toBe("SENDING");
      expect(
        await updateCardAddressByStaff(
          id,
          {
            fullName: "Test Insider",
            phone: "9876543210",
            line1: "1 Other Road",
            city: "Hyderabad",
            state: "Telangana",
            postalCode: "500032",
          },
          false,
          actor,
          { config, fetchImpl: booking },
        ),
      ).toEqual({ ok: false, reason: "CHECK_FIRST" });
    });

    it("needs the iThink keys", async () => {
      expect(await sendInsiderCards({}, actor, { config: null })).toEqual({
        ok: false,
        reason: "NOT_SET_UP",
      });
    });
  },
);
