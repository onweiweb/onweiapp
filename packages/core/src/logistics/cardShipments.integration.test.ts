import { prisma } from "@onwei/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { saveCardAddress, setCardPosted } from "../insiders/cardAddress";
import {
  cancelCardShipment,
  keepCardShipment,
  refreshCardShipments,
  sendInsiderCards,
} from "./cardShipments";
import type { IthinkConfig } from "./ithinkClient";

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
      actor = { staffUserId: (await prisma.staffUser.findFirstOrThrow()).id };
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

      const first = await refreshCardShipments(
        { startedAt: new Date(), max: 100 },
        { config, fetchImpl: track("In Transit", "UD") },
      );
      expect(first).toMatchObject({ ok: true });
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

    it("needs the iThink keys", async () => {
      expect(await sendInsiderCards({}, actor, { config: null })).toEqual({
        ok: false,
        reason: "NOT_SET_UP",
      });
    });
  },
);
