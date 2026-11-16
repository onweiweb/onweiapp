import {
  phoneOtpMode,
  sendWhatsApp,
  whatsAppAvailableFor,
  type PhoneOtpMode,
} from "@onwei/core";

/**
 * How a phone sign-in code goes out: a real code on WhatsApp once the
 * Gupshup sign-in template is switched on in admin, otherwise the static code
 * (never on the live production site). Shared by sign-in and My Account.
 */
export async function phoneCodeMode(
  channel: "SMS" | "WHATSAPP",
  siteMode: string,
): Promise<PhoneOtpMode> {
  const whatsappReady =
    channel === "WHATSAPP" &&
    (await whatsAppAvailableFor("SIGN_IN_CODE").catch(() => false));
  return phoneOtpMode({ env: process.env, siteMode, channel, whatsappReady });
}

/** Sends the code on WhatsApp. Returns false when it didn't go out. */
export async function sendWhatsAppCode(
  phone: string,
  code: string,
  customerId?: string,
): Promise<boolean> {
  const result = await sendWhatsApp({
    purpose: "SIGN_IN_CODE",
    phone,
    values: { code },
    customerId,
  });
  return result.status === "sent";
}
