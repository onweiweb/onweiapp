import { parseJsonBody, requestReturn } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { customerIdFrom } from "../../_lib/requestAuth";

const bodySchema = z.object({
  orderNumber: z.string().min(1).max(40),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1).max(64),
        quantity: z.number().int().min(0).max(100),
      }),
    )
    .min(1)
    .max(50),
  reason: z.string().min(1).max(100),
  resolution: z.enum(["REFUND", "EXCHANGE"]),
  note: z.string().max(500).optional(),
  payoutUpi: z.string().max(260).optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const customerId = await customerIdFrom(request);
  if (!customerId)
    return NextResponse.json(
      { ok: false, reason: "NOT_SIGNED_IN" },
      { status: 401 },
    );
  const result = await requestReturn({ customerId, ...parsed.data });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
