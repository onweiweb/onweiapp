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

export interface WhatsAppPurposeInfo {
  purpose: WhatsAppPurpose;
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

export const WHATSAPP_PURPOSES: Record<WhatsAppPurpose, WhatsAppPurposeInfo> = {
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
    title: "Joined the waitlist",
    whenSent: "Right after someone joins the waitlist.",
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
    category: "Marketing",
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
};

export const WHATSAPP_PURPOSE_LIST = Object.values(WHATSAPP_PURPOSES);

export function isAllowedVariable(
  purpose: WhatsAppPurpose,
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
