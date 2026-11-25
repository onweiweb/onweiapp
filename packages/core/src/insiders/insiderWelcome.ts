import { prisma } from "@onwei/database";
import {
  createEmailSender,
  createInsiderEmailSender,
  renderInsiderCodeEmail,
  type EmailSender,
} from "@onwei/emails";
import { firstNameOf } from "../messaging/whatsapp/purposes";
import { sendWhatsApp } from "../messaging/whatsapp/send";
import { markInsiderEmailSent } from "./insiderEmails";
import { createInsiderLinkToken, insiderEmailLinks } from "./insiderLink";

/**
 * The Insider welcome: the Insider code email and the Insider WhatsApp. Used
 * by admin (the email buttons and approving applications) and by the
 * storefront (someone let in by an Insider's number). One copy, so both apps
 * send exactly the same thing.
 */

export interface InsiderWelcomeRecipient {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  insiderCode: string;
}

/** Insider mail goes out as Sakshi (INSIDER_EMAIL_FROM) when set. */
export function insiderSender(): EmailSender {
  return createInsiderEmailSender() ?? createEmailSender();
}

export function renderInsiderWelcomeEmail(
  recipient: Pick<InsiderWelcomeRecipient, "id" | "fullName" | "insiderCode">,
  siteUrl: string,
) {
  const base = siteUrl.replace(/\/$/, "");
  return renderInsiderCodeEmail({
    fullName: recipient.fullName,
    code: recipient.insiderCode,
    siteUrl: base,
    ...insiderEmailLinks(recipient.id, base, process.env.INSIDER_LINK_SECRET),
  });
}

/**
 * The Insider WhatsApp (code plus the private address link as the button).
 * Skipped when the template is off, there is no phone or they replied STOP.
 * Never throws.
 */
export async function sendInsiderWhatsApp(
  recipient: Pick<
    InsiderWelcomeRecipient,
    "id" | "fullName" | "phone" | "insiderCode"
  >,
): Promise<"sent" | "failed" | "skipped"> {
  if (!recipient.phone) return "skipped";
  let addressToken: string;
  try {
    addressToken = createInsiderLinkToken(
      "address",
      recipient.id,
      process.env.INSIDER_LINK_SECRET,
    );
  } catch {
    return "skipped";
  }
  const result = await sendWhatsApp({
    purpose: "INSIDER_CODE",
    phone: recipient.phone,
    values: {
      firstName: firstNameOf(recipient.fullName),
      insiderCode: recipient.insiderCode,
      addressToken,
    },
    waitlistEntryId: recipient.id,
  });
  return result.status;
}

/**
 * Sends the welcome to one member who has a code and hasn't had it yet.
 * Claims the member first, so two senders can't both email them. Returns
 * "skipped" when there is nothing to send. Never throws.
 */
export async function sendInsiderWelcome(
  entryId: string,
  siteUrl: string,
): Promise<"sent" | "failed" | "skipped"> {
  try {
    const claimed = await prisma.waitlistEntry.updateMany({
      where: {
        id: entryId,
        status: "APPROVED",
        insiderCode: { not: null },
        codeEmailedAt: null,
        codeEmailClaimedAt: null,
        unsubscribedAt: null,
      },
      data: { codeEmailClaimedAt: new Date() },
    });
    if (claimed.count === 0) return "skipped";
    const entry = await prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entryId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        insiderCode: true,
      },
    });
    const recipient = { ...entry, insiderCode: entry.insiderCode! };
    try {
      await insiderSender().send(
        recipient.email,
        renderInsiderWelcomeEmail(recipient, siteUrl),
      );
    } catch (error) {
      console.error("[insiders] welcome email failed", entryId, error);
      await prisma.waitlistEntry.updateMany({
        where: { id: entryId, codeEmailedAt: null },
        data: { codeEmailClaimedAt: null },
      });
      return "failed";
    }
    await markInsiderEmailSent(entryId);
    await sendInsiderWhatsApp(recipient);
    return "sent";
  } catch (error) {
    console.error("[insiders] welcome failed", entryId, error);
    return "failed";
  }
}
