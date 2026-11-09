import {
  cardAddressBodySchema,
  checkInsiderLinkRateLimit,
  getClientIp,
  parseJsonBody,
  saveCardAddress,
  verifyInsiderLinkToken,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { invalidInput } from "../../_lib/invalidInput";

/**
 * Saves the address from the Insider email's "Share your address" link.
 * No sign-in: the signed token in the link says which member this is.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, cardAddressBodySchema);
  if (!parsed.ok) return invalidInput();
  const { token, ...address } = parsed.data;

  const ip = getClientIp(request) ?? "unknown";
  const { allowed } = await checkInsiderLinkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, reason: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const link = verifyInsiderLinkToken(
    "address",
    token,
    process.env.INSIDER_LINK_SECRET,
  );
  if (!link.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: link.reason === "EXPIRED" ? "LINK_EXPIRED" : "LINK_INVALID",
      },
      { status: 403 },
    );
  }

  const result = await saveCardAddress(link.entryId, address);
  if (!result.ok) {
    return NextResponse.json(
      result.reason === "INVALID_FIELDS"
        ? { ok: false, reason: "INVALID_FIELDS", fields: result.fields }
        : { ok: false, reason: "LINK_INVALID" },
      { status: result.reason === "INVALID_FIELDS" ? 400 : 403 },
    );
  }
  return NextResponse.json({ ok: true });
}
