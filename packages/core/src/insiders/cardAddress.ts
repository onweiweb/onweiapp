import { prisma } from "@onwei/database";
import { z } from "zod";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { validatePhone } from "../validation/phone";

/** Indian states and union territories, for the address form's dropdown. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

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

export async function saveCardAddress(
  entryId: string,
  input: CardAddressInput,
): Promise<SaveCardAddressResult> {
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

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    select: { id: true },
  });
  if (!entry) return { ok: false, reason: "NOT_FOUND" };

  const data = {
    fullName,
    phone: phone.e164 as string,
    line1,
    line2: line2 || null,
    city,
    state,
    postalCode,
  };
  await prisma.insiderCardAddress.upsert({
    where: { waitlistEntryId: entryId },
    create: { waitlistEntryId: entryId, ...data },
    update: data,
  });
  return { ok: true };
}

export interface CardAddressListRow extends CardAddressView {
  id: string;
  insiderCode: string | null;
  email: string;
  submittedAt: Date;
}

export async function listCardAddresses(input: {
  page: number;
  pageSize: number;
  show: "all" | "toPost" | "posted";
}): Promise<{ rows: CardAddressListRow[]; hasNext: boolean; total: number }> {
  const where =
    input.show === "toPost"
      ? { postedAt: null }
      : input.show === "posted"
        ? { postedAt: { not: null } }
        : {};
  const skip = (Math.max(input.page, 1) - 1) * input.pageSize;
  const [rows, total] = await Promise.all([
    prisma.insiderCardAddress.findMany({
      where,
      skip,
      take: input.pageSize + 1,
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      include: {
        waitlistEntry: { select: { insiderCode: true, email: true } },
      },
    }),
    prisma.insiderCardAddress.count({ where }),
  ]);
  return {
    rows: rows.slice(0, input.pageSize).map((row) => ({
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      postedAt: row.postedAt,
      submittedAt: row.submittedAt,
      insiderCode: row.waitlistEntry.insiderCode,
      email: row.waitlistEntry.email,
    })),
    hasNext: rows.length > input.pageSize,
    total,
  };
}

/** Every address still to post, oldest first, for the CSV export. */
export async function listAllCardAddresses(
  show: "all" | "toPost",
): Promise<CardAddressListRow[]> {
  const { rows } = await listCardAddresses({
    page: 1,
    pageSize: 10_000,
    show,
  });
  return rows;
}

export async function setCardPosted(
  addressId: string,
  posted: boolean,
  actor: AuditActor,
): Promise<{ ok: true } | { ok: false; reason: "NOT_FOUND" }> {
  const before = await prisma.insiderCardAddress.findUnique({
    where: { id: addressId },
    select: { id: true, postedAt: true },
  });
  if (!before) return { ok: false, reason: "NOT_FOUND" };
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
