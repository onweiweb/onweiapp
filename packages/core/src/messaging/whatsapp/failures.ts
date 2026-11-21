/**
 * Plain-language reasons for WhatsApp send failures, by the error code Meta
 * or Gupshup gave. Pure and browser-safe (exported as
 * "@onwei/core/whatsapp-failures") so admin pages can show them.
 *
 * Kinds:
 * - HELD: Meta held it back (marketing limits, experiments, person's own
 *   choice). Not our fault, so it is counted apart from real failures, and
 *   the person can be sent to again later.
 * - RATE_LIMIT: too many at once. Retried right away; if it still fails the
 *   person can be sent to again later.
 * - UNDELIVERABLE: the number can't get WhatsApp. Left out of later sends.
 * - TEMPLATE: something about the template or its values.
 * - OTHER: anything else.
 */
export type WhatsAppFailureKind =
  "HELD" | "RATE_LIMIT" | "UNDELIVERABLE" | "TEMPLATE" | "OTHER";

const KNOWN: Record<string, { kind: WhatsAppFailureKind; text: string }> = {
  "131049": {
    kind: "HELD",
    text: "Meta limited marketing messages to this person to protect their experience. Try later, or after they message you.",
  },
  "130472": {
    kind: "HELD",
    text: "Meta held this marketing message back as part of an experiment. Not your fault.",
  },
  "131050": {
    kind: "HELD",
    text: "This person turned off marketing messages from businesses in WhatsApp.",
  },
  "131026": {
    kind: "UNDELIVERABLE",
    text: "Could not be delivered. The number may not be on WhatsApp, or their app is too old.",
  },
  "429": {
    kind: "RATE_LIMIT",
    text: "Too many messages at once, WhatsApp asked us to slow down. Send to them again later.",
  },
  "130429": {
    kind: "RATE_LIMIT",
    text: "Too many messages at once, WhatsApp asked us to slow down. Send to them again later.",
  },
  "131056": {
    kind: "RATE_LIMIT",
    text: "Too many messages to this one number in a short time. Send to them again later.",
  },
  "131047": {
    kind: "OTHER",
    text: "More than 24 hours since they last wrote to us, so only an approved template can be sent.",
  },
  "131048": {
    kind: "OTHER",
    text: "Meta's spam limit was hit: too many people blocked or reported recent messages from Onwei.",
  },
  "132000": {
    kind: "TEMPLATE",
    text: "The number of values didn't match the template's blanks. Check the template's settings.",
  },
  "132001": {
    kind: "TEMPLATE",
    text: "The template isn't there or isn't approved in this language. Pick it again in the settings.",
  },
  "132012": {
    kind: "TEMPLATE",
    text: "A value didn't fit the template (for example the image or a link). Check the template's settings.",
  },
  "132015": {
    kind: "TEMPLATE",
    text: "Meta paused this template for low quality. Pick another one.",
  },
  "132016": {
    kind: "TEMPLATE",
    text: "Meta switched this template off for low quality. Pick another one.",
  },
};

/** Meta's or Gupshup's error code inside a failure reason, if any. */
export function failureCodeOf(
  reason: string | null | undefined,
): string | null {
  if (!reason) return null;
  const meta =
    /\(#(\d{3,6})\)/.exec(reason) ?? /^\s*(\d{3,6})\s*:/.exec(reason);
  if (meta) return meta[1]!;
  const http = /Gupshup said (\d{3})/.exec(reason);
  return http ? http[1]! : null;
}

export function failureKindOf(
  code: string | null | undefined,
): WhatsAppFailureKind {
  return (code && KNOWN[code]?.kind) || "OTHER";
}

/** Codes whose failures are Meta holding the message back, not ours. */
export const HELD_FAILURE_CODES = Object.entries(KNOWN)
  .filter(([, info]) => info.kind === "HELD")
  .map(([code]) => code);

/** Codes meaning the number can't get WhatsApp at all. */
export const UNDELIVERABLE_FAILURE_CODES = Object.entries(KNOWN)
  .filter(([, info]) => info.kind === "UNDELIVERABLE")
  .map(([code]) => code);

/** One line staff can act on; falls back to the raw reason. */
export function failureMessage(
  code: string | null | undefined,
  reason: string | null | undefined,
): string {
  const known = code ? KNOWN[code] : undefined;
  if (known) return known.text;
  if (reason === "Timed out" || reason === "Network error") {
    return "Couldn't reach Gupshup. Send to them again later.";
  }
  return (reason ?? "").replace(/^null,\s*/i, "").trim() || "No reason given";
}

export interface FailureGroup {
  code: string | null;
  /** Plain words for staff. */
  message: string;
  /** One raw reason from WhatsApp, for the small print. */
  raw: string | null;
  count: number;
}

/**
 * Merges failure rows by error code (or by reason when there's no code),
 * leaving out Meta's holds. Most common first.
 */
export function groupFailures(
  rows: {
    failureCode: string | null;
    failureReason: string | null;
    _count: { _all: number };
  }[],
): FailureGroup[] {
  const merged = new Map<string, FailureGroup>();
  for (const row of rows) {
    if (failureKindOf(row.failureCode) === "HELD") continue;
    const key = row.failureCode ?? `reason:${row.failureReason ?? ""}`;
    const found = merged.get(key);
    if (found) found.count += row._count._all;
    else
      merged.set(key, {
        code: row.failureCode,
        message: failureMessage(row.failureCode, row.failureReason),
        raw: row.failureReason,
        count: row._count._all,
      });
  }
  return [...merged.values()].sort((a, b) => b.count - a.count);
}
