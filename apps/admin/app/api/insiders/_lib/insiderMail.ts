import {
  createInsiderLinkToken,
  type InsiderEmailRecipient,
} from "@onwei/core";
import {
  ResendEmailSender,
  createEmailSender,
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INSIDER_EMAIL_FROM;
  if (apiKey && from) {
    return new ResendEmailSender(
      apiKey,
      from,
      process.env.INSIDER_EMAIL_REPLY_TO ?? process.env.EMAIL_REPLY_TO,
    );
  }
  return createEmailSender();
}

export function renderFor(
  recipient: Pick<InsiderEmailRecipient, "id" | "fullName" | "insiderCode">,
) {
  const secret = process.env.INSIDER_LINK_SECRET;
  const base = webUrl();
  const addressToken = createInsiderLinkToken("address", recipient.id, secret);
  const unsubscribeToken = createInsiderLinkToken(
    "unsubscribe",
    recipient.id,
    secret,
  );
  return renderInsiderCodeEmail({
    fullName: recipient.fullName,
    code: recipient.insiderCode,
    siteUrl: base,
    addressUrl: `${base}/insider/address?t=${encodeURIComponent(addressToken)}`,
    unsubscribeUrl: `${base}/insider/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}`,
    oneClickUnsubscribeUrl: `${base}/api/insider/unsubscribe?t=${encodeURIComponent(unsubscribeToken)}`,
  });
}
