/**
 * SMS sign-in codes are real once the MSG91 settings are in place
 * (`smsReady`). WhatsApp sign-in codes are real once the Gupshup sign-in template is set up
 * and switched on in admin (`whatsappReady`). SMS, and WhatsApp before that,
 * use a static code until real providers are wired
 * (docs/COMMERCE_BUILD_PLAN.md section 7). A static code lets anyone who
 * knows it sign in as any phone number, so:
 * - it only comes from the OTP_STATIC_CODE env var (never in git or the UI),
 * - it is refused in production once the site is LIVE (phone sign-in then
 *   reports itself unavailable until a provider is added).
 */
export type PhoneOtpMode =
  | { mode: "whatsapp" }
  | { mode: "sms" }
  | { mode: "static"; code: string }
  | { mode: "unavailable" };

const CODE = /^\d{6}$/;

export function phoneOtpMode(input: {
  env: Record<string, string | undefined>;
  siteMode: string;
  channel?: "SMS" | "WHATSAPP";
  /** Gupshup connected and the sign-in template switched on. */
  whatsappReady?: boolean;
  /** MSG91 settings in place. */
  smsReady?: boolean;
}): PhoneOtpMode {
  if (input.channel === "SMS" && input.smsReady) return { mode: "sms" };
  if (input.channel === "WHATSAPP" && input.whatsappReady) {
    return { mode: "whatsapp" };
  }
  const code = input.env.OTP_STATIC_CODE?.trim();
  if (!code || !CODE.test(code)) return { mode: "unavailable" };
  const production =
    input.env.VERCEL_ENV === "production" ||
    (input.env.NODE_ENV === "production" && !input.env.VERCEL_ENV);
  if (production && input.siteMode === "LIVE") return { mode: "unavailable" };
  return { mode: "static", code };
}
