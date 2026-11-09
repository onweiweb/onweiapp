import { parseJsonBody, updateCustomerName } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom } from "../../_lib/requestAuth";

const bodySchema = z.object({ name: z.string().max(100) });

export async function PATCH(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const result = await updateCustomerName(customerId, parsed.data.name);
  if (!result.ok)
    return NextResponse.json(
      { ok: false, reason: "INVALID_NAME" },
      { status: 400 },
    );
  return NextResponse.json({ ok: true });
}
