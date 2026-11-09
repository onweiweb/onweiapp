import { getCartView, parseJsonBody, setApplyInsider } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom } from "../../_lib/requestAuth";

const bodySchema = z.object({ on: z.boolean() });

/** Switches the signed-in Insider's discount on or off for this cart. */
export async function PATCH(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId) {
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  }
  await setApplyInsider({ customerId }, parsed.data.on);
  return NextResponse.json({
    ok: true,
    cart: await getCartView({ customerId }),
  });
}
