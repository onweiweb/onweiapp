import {
  createInsiderLinkToken,
  firstNameOf,
  insiderEmailLinks,
  sendWhatsApp,
  type InsiderEmailRecipient,
} from "@onwei/core";
import {
  createEmailSender,
  createInsiderEmailSender,
  renderInsiderCodeEmail,
  type EmailSender,
} from "@onwei/emails";

const DEFAULT_WEB_URL = "https://www.onwei.in";

/** The storefront the email links to (and loads images from). */
export function webUrl(): string {
  return (process.env.WEB_APP_URL ?? DEFAULT_WEB_URL).replace(/\/$/, "");
}

/**
 * Insider mail goes out as Sakshi (INSIDER_EMAIL_FROM) when set, otherwise
 * the normal sender. Without RESEND_API_KEY it only logs to the console.
 */
export function insiderSender(): EmailSender {
  return createInsiderEmailSender() ?? createEmailSender();
}

export function renderFor(
  recipient: Pick<InsiderEmailRecipient, "id" | "fullName" | "insiderCode">,
) {
  const base = webUrl();
  return renderInsiderCodeEmail({
    fullName: recipient.fullName,
    code: recipient.insiderCode,
    siteUrl: base,
    ...insiderEmailLinks(recipient.id, base, process.env.INSIDER_LINK_SECRET),
  });
}

/**
 * The Insider WhatsApp (code plus the private address link as the button),
 * sent right after that member's email. Skipped when the template is off,
 * the member has no phone or replied STOP. Never throws.
 */
export async function sendInsiderWhatsApp(
  recipient: Pick<
    InsiderEmailRecipient,
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
