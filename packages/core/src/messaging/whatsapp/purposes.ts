import type { WhatsAppPurpose } from "@onwei/database";

/**
 * Every kind of WhatsApp message Onwei sends, and which values each one can
 * put into its template. Staff pick the template's variable order from this
 * list in admin, so a typo can never send a broken message. Adding a new kind
 * of message means a new enum value, a new entry here and a call site.
 */
export interface WhatsAppVariable {
  key: string;
  /** Shown in admin. */
  label: string;
  /** Example value for the admin test send. */
  sample: string;
}

/** Messages with one fixed template each. Campaigns pick any template. */
export type TemplatePurpose = Exclude<WhatsAppPurpose, "CAMPAIGN">;

export interface WhatsAppPurposeInfo {
  purpose: TemplatePurpose;
  /** Admin card title. */
  title: string;
  /** Admin help text: when it is sent. */
  whenSent: string;
  /** The Meta category the template should be approved under. */
  category: "Authentication" | "Utility" | "Marketing";
  variables: WhatsAppVariable[];
  /** Sign-in codes are asked for by the person, so STOP does not block them. */
  respectsOptOut: boolean;
  /** Authentication templates can't have an image. */
  allowsImage: boolean;
}

export const WHATSAPP_PURPOSES: Record<TemplatePurpose, WhatsAppPurposeInfo> = {
  SIGN_IN_CODE: {
    purpose: "SIGN_IN_CODE",
    title: "Sign-in code",
    whenSent:
      "When a shopper picks WhatsApp to get their sign-in code, or adds a phone number in My Account.",
    category: "Authentication",
    variables: [{ key: "code", label: "The 6-digit code", sample: "482913" }],
    respectsOptOut: false,
    allowsImage: false,
  },
  WAITLIST_JOINED: {
    purpose: "WAITLIST_JOINED",
    title: "Welcome to Insiders",
    whenSent:
      "Right after someone signs up as an Insider (the waitlist form before launch, the Insiders page after).",
    category: "Utility",
    variables: [{ key: "firstName", label: "First name", sample: "Priya" }],
    respectsOptOut: true,
    allowsImage: true,
  },
  INSIDER_CODE: {
    purpose: "INSIDER_CODE",
    title: "Insider code and address link",
    whenSent:
      "With the Insider email, when staff press send on Insiders > Email. Only members with a phone number.",
    category: "Utility",
    variables: [
      { key: "firstName", label: "First name", sample: "Priya" },
      { key: "insiderCode", label: "Insider code", sample: "WEI4821" },
      {
        key: "addressToken",
        label: "Private address link (end of the button link)",
        sample: "cm3x9k2.1798000000.Ab3dEf",
      },
    ],
    respectsOptOut: true,
    allowsImage: true,
  },
  PREORDER_RESERVED: {
    purpose: "PREORDER_RESERVED",
    title: "Pre-order reserved",
    whenSent: "Right after a customer pays the reserve for a pre-order.",
    category: "Utility",
    variables: [
      { key: "firstName", label: "First name", sample: "Priya" },
      { key: "orderNumber", label: "Order number", sample: "ONW1042" },
      {
        key: "product",
        label: "What they reserved",
        sample: "Onwei Paddle Pro x 1",
      },
      { key: "paidNow", label: "Amount paid now", sample: "₹900" },
      { key: "balance", label: "Balance to pay later", sample: "₹2,500" },
    ],
    respectsOptOut: true,
    allowsImage: true,
  },
  PREORDER_BALANCE: {
    purpose: "PREORDER_BALANCE",
    title: "Pre-order ready, pay the balance",
    whenSent:
      'When staff press "Stock is in" on the pre-order page, and as reminders after 3 and 7 days if it\'s still unpaid.',
    category: "Utility",
    variables: [
      { key: "firstName", label: "First name", sample: "Priya" },
      { key: "orderNumber", label: "Order number", sample: "ONW1042" },
      { key: "balance", label: "Balance to pay", sample: "₹2,500" },
      {
        key: "orderPath",
        label: "Order page (end of the button link)",
        sample: "ONW1042",
      },
    ],
    respectsOptOut: true,
    allowsImage: true,
  },
  PREORDER_CREDIT: {
    purpose: "PREORDER_CREDIT",
    title: "Pre-order credit",
    whenSent:
      "When a pre-order is cancelled (by the customer, by staff, or because the balance wasn't paid in 14 days) and the reserve becomes credit.",
    category: "Utility",
    variables: [
      { key: "firstName", label: "First name", sample: "Priya" },
      { key: "amount", label: "Credit amount", sample: "₹900" },
      { key: "creditCode", label: "Credit code", sample: "CR-7K2M9Q" },
      { key: "validUntil", label: "Valid until", sample: "20 Nov 2027" },
    ],
    respectsOptOut: true,
    allowsImage: false,
  },
};

export const WHATSAPP_PURPOSE_LIST = Object.values(WHATSAPP_PURPOSES);

export function isAllowedVariable(
  purpose: TemplatePurpose,
  key: string,
): boolean {
  return WHATSAPP_PURPOSES[purpose].variables.some((v) => v.key === key);
}

/** First word of a full name, for "Hi {{1}}". */
export function firstNameOf(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

/**
 * The template's params in the order staff set. Keys may repeat (some
 * templates need the code twice, once for the body and once for the button).
 * Returns null when a value is missing, so nothing half-filled is sent.
 */
export function buildTemplateParams(
  variables: readonly string[],
  values: Record<string, string | undefined>,
): string[] | null {
  const params: string[] = [];
  for (const key of variables) {
    const value = values[key]?.trim();
    if (!value) return null;
    params.push(value);
  }
  return params;
}
