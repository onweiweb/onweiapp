import { prisma } from "@onwei/database";
import { getInsiderPercentFor } from "../insiders/insiderTiers";

/** A signed-in customer, with only the contacts they proved they own. */
export interface CustomerIdentity {
  id: string;
  name: string | null;
  /** Verified email, lowercased, or null. */
  email: string | null;
  /** Verified phone in +91 form, or null. */
  phone: string | null;
}

export async function getCustomerIdentity(
  customerId: string,
): Promise<CustomerIdentity | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      phone: true,
      phoneVerifiedAt: true,
    },
  });
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    email:
      customer.emailVerifiedAt && customer.email
        ? customer.email.toLowerCase()
        : null,
    phone: customer.phoneVerifiedAt && customer.phone ? customer.phone : null,
  };
}

export interface InsiderStatus {
  waitlistEntryId: string;
  code: string;
  percent: number;
  cardPostedAt: Date | null;
  hasCardAddress: boolean;
}

/**
 * The customer's Insider membership, found by their verified email or phone
 * matching a waitlist entry. This is what makes an Insider code "only work
 * for its owner": nothing else unlocks the discount.
 */
export async function getInsiderStatus(
  identity: Pick<CustomerIdentity, "email" | "phone">,
): Promise<InsiderStatus | null> {
  const or: { email?: string; phone?: string }[] = [];
  if (identity.email) or.push({ email: identity.email });
  if (identity.phone) or.push({ phone: identity.phone });
  if (or.length === 0) return null;

  const entry = await prisma.waitlistEntry.findFirst({
    where: { OR: or, insiderCode: { not: null } },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      insiderCode: true,
      submittedAt: true,
      cardAddress: { select: { postedAt: true } },
    },
  });
  if (!entry?.insiderCode) return null;
  return {
    waitlistEntryId: entry.id,
    code: entry.insiderCode,
    percent: await getInsiderPercentFor(entry.submittedAt),
    cardPostedAt: entry.cardAddress?.postedAt ?? null,
    hasCardAddress: Boolean(entry.cardAddress),
  };
}

/**
 * Orders that count as "placed" for first-order and per-customer checks:
 * paid, or accepted cash on delivery. Matched by account and by verified
 * email or phone, so a second account can't get a second first order.
 */
export async function countPlacedOrders(
  identity: Pick<CustomerIdentity, "id" | "email" | "phone">,
): Promise<number> {
  const or: object[] = [{ customerId: identity.id }];
  if (identity.email) or.push({ contactEmail: identity.email });
  if (identity.phone) or.push({ contactPhone: identity.phone });
  return prisma.order.count({
    where: {
      OR: or,
      status: { notIn: ["PENDING", "CANCELLED"] },
      deletedAt: null,
    },
  });
}
