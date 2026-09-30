import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface PhoneValidationResult {
  valid: boolean;
  // E.164 (e.g. "+919876543210"), only present when valid: true.
  e164?: string;
}

/**
 * Accepts a bare 10-digit Indian mobile number (no country code needed,
 * region-hinted to "IN") or any number with an explicit "+<country code>"
 * prefix. When allowInternational is false, only numbers that resolve to
 * India are accepted, see SiteSetting.allowInternationalPhone, which this
 * flag is meant to be threaded from.
 */
export function validatePhone(
  raw: string,
  { allowInternational }: { allowInternational: boolean },
): PhoneValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false };

  const parsed = parsePhoneNumberFromString(trimmed, "IN");
  if (!parsed || !parsed.isValid()) return { valid: false };
  if (!allowInternational && parsed.country !== "IN") return { valid: false };

  return { valid: true, e164: parsed.number };
}
