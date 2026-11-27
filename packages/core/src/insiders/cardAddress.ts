import { INDIAN_STATES } from "../geo/indianStates";
import { prisma } from "@onwei/database";
import { z } from "zod";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { validatePhone } from "../validation/phone";
import {
  cancelCardShipment,
  flagCardAddressChanged,
  hasActiveCardShipment,
  sendInsiderCards,
  type IthinkDeps,
} from "../logistics/cardShipments";

export { INDIAN_STATES };

const PIN_PATTERN = /^[1-9]\d{5}$/;

/** Shape check only, the API route runs it through parseJsonBody. */
export const cardAddressBodySchema = z.object({
  token: z.string().min(1).max(300),
  fullName: z.string().max(100),
  phone: z.string().max(20),
  line1: z.string().max(200),
  line2: z.string().max(200).optional(),
  city: z.string().max(80),
  state: z.string().max(80),
  postalCode: z.string().max(10),
});

export interface CardAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export type CardAddressField =
  "fullName" | "phone" | "line1" | "city" | "state" | "postalCode";

export type SaveCardAddressResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_FIELDS"; fields: CardAddressField[] }
  | { ok: false; reason: "NOT_FOUND" };

export interface CardAddressView {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  postedAt: Date | null;
}

/** What the "Share your address" page shows: name to greet, saved address. */
export async function getCardAddressForEntry(entryId: string): Promise<{
  fullName: string;
  firstName: string;
  phone: string;
  address: CardAddressView | null;
} | null> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    select: { fullName: true, phone: true, cardAddress: true },
  });
  if (!entry) return null;
  return {
    fullName: entry.fullName.trim(),
    firstName: entry.fullName.trim().split(/\s+/)[0] ?? "",
    phone: entry.phone,
    address: entry.cardAddress,
  };
}

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

interface CleanCardAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
}

/** The one address check, for the member's link and for staff edits. */
export function checkCardAddress(
  input: CardAddressInput,
):
  | { ok: true; data: CleanCardAddress }
  | { ok: false; reason: "INVALID_FIELDS"; fields: CardAddressField[] } {
  const fullName = clean(input.fullName);
  const line1 = clean(input.line1);
  const line2 = clean(input.line2);
  const city = clean(input.city);
  const state = clean(input.state);
  const postalCode = clean(input.postalCode).replace(/\s/g, "");
  const phone = validatePhone(input.phone, { allowInternational: false });

  const bad: CardAddressField[] = [];
  if (fullName.length < 2) bad.push("fullName");
  if (!phone.valid || !phone.e164) bad.push("phone");
  if (line1.length < 3) bad.push("line1");
  if (city.length < 2) bad.push("city");
  if (!(INDIAN_STATES as readonly string[]).includes(state)) bad.push("state");
  if (!PIN_PATTERN.test(postalCode)) bad.push("postalCode");
  if (bad.length > 0)
    return { ok: false, reason: "INVALID_FIELDS", fields: bad };
  return {
    ok: true,
    data: {
      fullName,
      phone: phone.e164 as string,
      line1,
      line2: line2 || null,
      city,
      state,
      postalCode,
    },
  };
}

export async function saveCardAddress(
  entryId: string,
  input: CardAddressInput,
): Promise<SaveCardAddressResult> {
  const checked = checkCardAddress(input);
  if (!checked.ok) return checked;
  const data = checked.data;

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    select: { id: true },
  });
  if (!entry) return { ok: false, reason: "NOT_FOUND" };

  const before = await prisma.insiderCardAddress.findUnique({
    where: { waitlistEntryId: entryId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
    },
  });
  await prisma.$transaction(async (tx) => {
    await tx.insiderCardAddress.upsert({
      where: { waitlistEntryId: entryId },
      create: { waitlistEntryId: entryId, ...data },
      update: data,
    });
    // A card already booked with the old address needs a look from staff.
    if (before) {
      const { id, ...old } = before;
      if (JSON.stringify(old) !== JSON.stringify(data)) {
        await flagCardAddressChanged(id, tx);
      }
    }
  });
  return { ok: true };
}

/** Posted by hand (delivered without iThink), or undo that. */
export async function setCardPosted(
  addressId: string,
  posted: boolean,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" | "SHIPPING" }> {
  const before = await prisma.insiderCardAddress.findUnique({
    where: { id: addressId },
    select: { id: true, postedAt: true },
  });
  if (!before) return { ok: false, reason: "NOT_FOUND" };
  // A card going through iThink is marked posted by the courier update.
  if (await hasActiveCardShipment(addressId)) {
    return { ok: false, reason: "SHIPPING" };
  }
  await prisma.$transaction(async (tx) => {
    const row = await tx.insiderCardAddress.update({
      where: { id: addressId },
      data: { postedAt: posted ? new Date() : null },
      select: { id: true, postedAt: true },
    });
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: posted ? "insider.card.posted" : "insider.card.unposted",
        entityType: "InsiderCardAddress",
        entityId: addressId,
        beforeState: before,
        afterState: row,
      },
      tx,
    );
  });
  return { ok: true };
}

export type StaffAddressEditResult =
  | { ok: false; reason: "INVALID_FIELDS"; fields: CardAddressField[] }
  | { ok: false; reason: "NOT_FOUND" }
  /** iThink hasn't replied about the last send: "Check again" first. */
  | { ok: false; reason: "CHECK_FIRST" }
  /** The courier has the card (or it's delivered): the parcel can't change. */
  | { ok: false; reason: "WITH_COURIER" }
  | {
      ok: true;
      /** What happened after saving. */
      outcome:
        | "SAVED"
        | "SENT"
        | "SEND_FAILED"
        | "NOT_SENT_CANCEL_REFUSED"
        | "NOT_SET_UP";
      /** iThink's words when the cancel or the new send didn't go through. */
      message?: string;
    };

/**
 * Staff fix an Insider's card address from Ship cards (Ready to send, Needs
 * a look). With `send`, a card that can go again is sent with the new
 * address; a booked one is cancelled on iThink first. A booked card saved
 * without sending keeps its "address changed" flag, so it stays in Needs a
 * look. The audit row names the fields changed, not the address itself.
 */
export async function updateCardAddressByStaff(
  addressId: string,
  input: CardAddressInput,
  send: boolean,
  actor: AuditActor,
  deps: IthinkDeps = {},
): Promise<StaffAddressEditResult> {
  const checked = checkCardAddress(input);
  if (!checked.ok) return checked;
  const data = checked.data;

  const before = await prisma.insiderCardAddress.findUnique({
    where: { id: addressId },
    select: {
      fullName: true,
      phone: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
      shipments: {
        where: { isCurrent: true },
        take: 1,
        select: { status: true },
      },
    },
  });
  if (!before) return { ok: false, reason: "NOT_FOUND" };
  const status = before.shipments[0]?.status;
  if (status === "SENDING") return { ok: false, reason: "CHECK_FIRST" };
  if (
    status === "IN_TRANSIT" ||
    status === "OUT_FOR_DELIVERY" ||
    status === "DELIVERED"
  ) {
    return { ok: false, reason: "WITH_COURIER" };
  }

  const changed = (Object.keys(data) as (keyof CleanCardAddress)[]).filter(
    (key) => before[key] !== data[key],
  );
  if (changed.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.insiderCardAddress.update({ where: { id: addressId }, data });
      if (status === "BOOKED") await flagCardAddressChanged(addressId, tx);
      await writeAuditLog(
        {
          staffUserId: actor.staffUserId,
          action: "insider.address.update",
          entityType: "InsiderCardAddress",
          entityId: addressId,
          afterState: { changedFields: changed },
        },
        tx,
      );
    });
  }

  // A parcel coming back can't be sent again until it's back.
  if (!send || status === "RETURNING") return { ok: true, outcome: "SAVED" };

  if (status === "BOOKED") {
    const cancelled = await cancelCardShipment(addressId, actor, deps);
    if (!cancelled.ok) {
      if (cancelled.reason === "NOT_SET_UP")
        return { ok: true, outcome: "NOT_SET_UP" };
      return {
        ok: true,
        outcome: "NOT_SENT_CANCEL_REFUSED",
        message: cancelled.reason === "ITHINK" ? cancelled.message : undefined,
      };
    }
  }
  const sent = await sendInsiderCards({ addressIds: [addressId] }, actor, deps);
  if (!sent.ok) return { ok: true, outcome: "NOT_SET_UP" };
  if (sent.booked > 0) return { ok: true, outcome: "SENT" };
  return {
    ok: true,
    outcome: "SEND_FAILED",
    message: sent.problems[0]?.reason,
  };
}
