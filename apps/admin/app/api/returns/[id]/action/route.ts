import {
  approveReturnRequest,
  markReturnExchanged,
  markReturnPickedUp,
  markReturnReceived,
  refundReturn,
  rejectReturnRequest,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "../../../_lib/requireStaffSession";
import { actionError } from "../../../_lib/orderActionResponse";
import { razorpayConfig } from "../../../_lib/razorpay";
import { parseJsonBody } from "@onwei/core";

const bodySchema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "pickedUp",
    "received",
    "refund",
    "exchanged",
  ]),
  reason: z.string().max(300).optional(),
  restock: z.boolean().optional(),
  note: z.string().max(300).optional(),
});

// Each step needs its own permission: approving and rejecting are return
// decisions, refunding moves money.
const PERMISSION: Record<z.infer<typeof bodySchema>["action"], string> = {
  approve: "return:approve",
  reject: "return:reject",
  pickedUp: "return:approve",
  received: "return:approve",
  refund: "order:refund",
  exchanged: "return:approve",
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: "Pick an action." },
      { status: 400 },
    );
  }
  const session = await requireStaffSession(
    request,
    PERMISSION[parsed.data.action],
  );
  if (!session.ok) return session.response;
  const actor = { staffUserId: session.context.staffUserId };
  const { id } = await context.params;
  const body = parsed.data;
  try {
    switch (body.action) {
      case "approve":
        await approveReturnRequest(id, actor);
        break;
      case "reject":
        await rejectReturnRequest(id, body.reason ?? "", actor);
        break;
      case "pickedUp":
        await markReturnPickedUp(id, actor);
        break;
      case "received":
        await markReturnReceived(id, body.restock ?? true, actor);
        break;
      case "refund": {
        const result = await refundReturn(id, actor, razorpayConfig());
        if (!result.ok)
          return NextResponse.json(
            { ok: false, error: result.message },
            { status: 400 },
          );
        break;
      }
      case "exchanged":
        await markReturnExchanged(id, body.note ?? "", actor);
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return actionError(error);
  }
}
