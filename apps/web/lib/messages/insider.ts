/**
 * Every customer-facing line for the Insider pages, in one place
 * (docs/COMMERCE_BUILD_PLAN.md, section 11: messaging standards). The API
 * answers with a reason code, the page shows the line from here. Change copy
 * here, never inline in a component.
 */

export const INSIDER_FIELD_ERRORS = {
  fullName: "Add the name we should post it to.",
  phone: "Add a 10-digit Indian mobile number, so the courier can reach you.",
  line1: "Add your house or flat number and street.",
  city: "Add your city or town.",
  state: "Pick your state.",
  postalCode: "PIN codes are 6 digits, like 400050.",
} as const;

export const INSIDER_ERRORS = {
  LINK_INVALID:
    "This link doesn't look right. Open it again from your Insider email, or write to us at admin@onwei.in.",
  LINK_EXPIRED:
    "This link has expired. Write to us at admin@onwei.in and we'll send you a fresh one.",
  RATE_LIMITED: "That was a lot of tries. Wait a few minutes and try again.",
  INVALID_FIELDS: "A few details need a look. Check the highlighted fields.",
  NETWORK: "We couldn't save that. Check your connection and try again.",
} as const;

export type InsiderErrorReason = keyof typeof INSIDER_ERRORS;

export function insiderErrorFor(reason: string | undefined): string {
  return reason && reason in INSIDER_ERRORS
    ? INSIDER_ERRORS[reason as InsiderErrorReason]
    : INSIDER_ERRORS.NETWORK;
}
