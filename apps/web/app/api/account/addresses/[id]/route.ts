import { deleteAddress, parseJsonBody, saveAddress } from "@onwei/core";
import { NextResponse } from "next/server";
import { invalidInput } from "../../../_lib/invalidInput";
import { customerIdFrom } from "../../../_lib/requestAuth";
import { addressSchema } from "../_schema";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(request, addressSchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const { id } = await context.params;
  const result = await saveAddress(customerId, parsed.data, id);
  if (!result.ok) {
    return NextResponse.json(
      result.reason === "NOT_FOUND"
        ? { ok: false, reason: "NOT_FOUND" }
        : { ok: false, reason: "INVALID_FIELDS", fields: result.fields ?? [] },
      { status: result.reason === "NOT_FOUND" ? 404 : 400 },
    );
  }
  return NextResponse.json({ ok: true, address: result.address });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const { id } = await context.params;
  const removed = await deleteAddress(customerId, id);
  return NextResponse.json({ ok: removed }, { status: removed ? 200 : 404 });
}
