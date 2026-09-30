import { NextResponse } from "next/server";

/**
 * Storefront routes answer failures with a machine-readable `reason` the UI
 * maps to its own copy (never a raw message). Used when a request body is
 * missing, oversized, or the wrong shape.
 */
export function invalidInput(): NextResponse {
  return NextResponse.json(
    { ok: false, reason: "INVALID_INPUT" },
    { status: 400 },
  );
}
