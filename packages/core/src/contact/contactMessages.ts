import { prisma } from "@onwei/database";
import type { ContactStatus } from "@onwei/database";
import { writeAuditLog } from "../admin/auditLog";
import type { AuditActor } from "../admin/types";
import { createLazyLimiter } from "../rateLimit/lazyLimiter";
import { isValidEmail } from "../validation/email";
import { validatePhone } from "../validation/phone";

// Contact Us form (storefront) and the admin Messages inbox.

export const CONTACT_LIMITS = {
  name: 100,
  email: 200,
  message: 3000,
} as const;

export type ContactField = "fullName" | "email" | "phone" | "message";

export interface ContactInput {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export type ContactValidation =
  | {
      ok: true;
      value: {
        fullName: string;
        email: string;
        phone: string | null;
        message: string;
      };
    }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

/** Plain-language checks, shared by the form and the API route. */
export function validateContactInput(input: ContactInput): ContactValidation {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phoneRaw = input.phone.trim();
  const message = input.message.trim();
  const errors: Partial<Record<ContactField, string>> = {};

  if (!fullName) errors.fullName = "Tell us your name.";
  else if (fullName.length > CONTACT_LIMITS.name)
    errors.fullName = "That name is a bit long.";
  if (!email) errors.email = "Add your email so we can reply.";
  else if (email.length > CONTACT_LIMITS.email || !isValidEmail(email))
    errors.email = "That email doesn't look right.";
  let phone: string | null = null;
  if (phoneRaw) {
    const checked = validatePhone(phoneRaw, { allowInternational: true });
    if (!checked.valid) errors.phone = "That phone number doesn't look right.";
    else phone = checked.e164 ?? null;
  }
  if (!message) errors.message = "Write us a message.";
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = `Keep it under ${CONTACT_LIMITS.message} characters.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { fullName, email, phone, message } };
}

const limiter = createLazyLimiter({
  limit: 5,
  window: "10 m",
  prefix: "contact",
});

/** 5 messages per 10 minutes per IP. */
export async function checkContactRateLimit(
  identifier: string,
): Promise<{ allowed: boolean }> {
  return { allowed: await limiter.check(identifier) };
}

export async function saveContactMessage(
  value: Extract<ContactValidation, { ok: true }>["value"],
): Promise<{ id: string }> {
  const row = await prisma.contactMessage.create({
    data: value,
    select: { id: true },
  });
  return row;
}

export interface ContactMessageRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  repliedAt: Date | null;
}

/** Newest first. Pass the admin pager's skip/take (it asks for one extra). */
export async function listContactMessages(input: {
  status?: ContactStatus;
  skip: number;
  take: number;
}): Promise<ContactMessageRow[]> {
  return prisma.contactMessage.findMany({
    where: input.status ? { status: input.status } : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: input.skip,
    take: input.take,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      message: true,
      status: true,
      createdAt: true,
      repliedAt: true,
    },
  });
}

export async function countNewContactMessages(): Promise<number> {
  return prisma.contactMessage.count({ where: { status: "NEW" } });
}

/** Marks a message replied (or back to new), compare-and-set on the status. */
export async function setContactMessageStatus(
  id: string,
  status: ContactStatus,
  actor: AuditActor,
): Promise<{ ok: boolean }> {
  return prisma.$transaction(async (tx) => {
    const from: ContactStatus = status === "REPLIED" ? "NEW" : "REPLIED";
    const changed = await tx.contactMessage.updateMany({
      where: { id, status: from },
      data:
        status === "REPLIED"
          ? {
              status,
              repliedAt: new Date(),
              repliedByStaffId: actor.staffUserId,
            }
          : { status, repliedAt: null, repliedByStaffId: null },
    });
    if (changed.count === 0) return { ok: false };
    await writeAuditLog(
      {
        staffUserId: actor.staffUserId,
        action: status === "REPLIED" ? "contact.replied" : "contact.reopened",
        entityType: "ContactMessage",
        entityId: id,
        beforeState: { status: from },
        afterState: { status },
      },
      tx,
    );
    return { ok: true };
  });
}
