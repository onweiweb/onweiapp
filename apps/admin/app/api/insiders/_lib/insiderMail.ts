import {
  insiderSender as coreInsiderSender,
  renderInsiderWelcomeEmail,
  sendInsiderWhatsApp as coreSendInsiderWhatsApp,
  type InsiderEmailRecipient,
} from "@onwei/core";
import type { EmailSender } from "@onwei/emails";

const DEFAULT_WEB_URL = "https://www.onwei.in";

/** The storefront the email links to (and loads images from). */
export function webUrl(): string {
  return (process.env.WEB_APP_URL ?? DEFAULT_WEB_URL).replace(/\/$/, "");
}

/**
 * Insider mail goes out as Sakshi (INSIDER_EMAIL_FROM) when set, otherwise
 * the normal sender. Without RESEND_API_KEY it only logs to the console.
 * The email and WhatsApp themselves live in core (`insiderWelcome.ts`), so
 * the storefront sends exactly the same welcome.
 */
export function insiderSender(): EmailSender {
  return coreInsiderSender();
}

export function renderFor(
  recipient: Pick<InsiderEmailRecipient, "id" | "fullName" | "insiderCode">,
) {
  return renderInsiderWelcomeEmail(recipient, webUrl());
}

export const sendInsiderWhatsApp = (
  recipient: Pick<
    InsiderEmailRecipient,
    "id" | "fullName" | "phone" | "insiderCode"
  >,
) => coreSendInsiderWhatsApp(recipient);
