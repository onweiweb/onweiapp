/**
 * SMS and WhatsApp sign-in codes are static until real providers are wired
 * (docs/COMMERCE_BUILD_PLAN.md section 7). A static code lets anyone who
 * knows it sign in as any phone number, so:
 * - it only comes from the OTP_STATIC_CODE env var (never in git or the UI),
 * - it is refused in production once the site is LIVE (phone sign-in then
 *   reports itself unavailable until a provider is added).
 */
export type PhoneOtpMode =
  { mode: "static"; code: string } | { mode: "unavailable" };

const CODE = /^\d{6}$/;

export function phoneOtpMode(input: {
  env: Record<string, string | undefined>;
  siteMode: string;
}): PhoneOtpMode {
  const code = input.env.OTP_STATIC_CODE?.trim();
  if (!code || !CODE.test(code)) return { mode: "unavailable" };
  const production =
    input.env.VERCEL_ENV === "production" ||
    (input.env.NODE_ENV === "production" && !input.env.VERCEL_ENV);
  if (production && input.siteMode === "LIVE") return { mode: "unavailable" };
  return { mode: "static", code };
}
