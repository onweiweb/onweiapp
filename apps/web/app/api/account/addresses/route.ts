import { listAddresses, parseJsonBody, saveAddress } from "@onwei/core";
import { NextResponse } from "next/server";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom } from "../../_lib/requestAuth";
import { addressSchema } from "./_schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  return NextResponse.json({
    ok: true,
    addresses: await listAddresses(customerId),
  });
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, addressSchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const count = (await listAddresses(customerId)).length;
  if (count >= 20)
    return NextResponse.json(
      { ok: false, reason: "TOO_MANY" },
      { status: 400 },
    );
  const result = await saveAddress(customerId, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_FIELDS", fields: result.fields ?? [] },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, address: result.address });
}
