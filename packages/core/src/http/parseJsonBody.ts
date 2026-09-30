import type { z } from "zod";

// Generous for every form and editor in both apps, small enough that a
// hostile client can't make a route buffer megabytes of JSON.
const MAX_BODY_BYTES = 64 * 1024;

export type ParseJsonBodyResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      /** EMPTY: missing, oversized or not a JSON object. INVALID: failed the schema. */
      kind: "EMPTY" | "INVALID";
      /** The first schema problem's message, or a generic one for EMPTY. */
      message: string;
    };

/**
 * Reads a request's JSON body and validates it against a zod schema. One
 * implementation for every API route in both apps, so input handling (size
 * cap, "must be a JSON object", first-issue message) can't drift per route.
 * Returns a result instead of throwing or building a Response, so each app
 * maps failures to its own error shape (admin: `{ error }`, storefront:
 * `{ reason }`).
 */
export async function parseJsonBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<ParseJsonBodyResult<z.output<TSchema>>> {
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY_BYTES) {
    return { ok: false, kind: "EMPTY", message: "Nothing was sent." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, kind: "EMPTY", message: "Nothing was sent." };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, kind: "EMPTY", message: "Nothing was sent." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "INVALID",
      message:
        parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  return { ok: true, data: parsed.data };
}
