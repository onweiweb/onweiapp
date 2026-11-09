import { getCartView, parseJsonBody, quickAddProduct } from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../../_lib/invalidInput";
import { cartOwnerFrom, setGuestCookie } from "../../_lib/requestAuth";

const bodySchema = z.object({ productId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return invalidInput();
  const { owner, newGuestToken } = await cartOwnerFrom(request, {
    createGuest: true,
  });
  const result = await quickAddProduct(owner, parsed.data.productId);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        slug: "slug" in result ? result.slug : undefined,
      },
      { status: result.reason === "NEEDS_CHOICE" ? 200 : 400 },
    );
  }
  const response = NextResponse.json({
    ok: true,
    cart: await getCartView(owner),
  });
  if (newGuestToken) setGuestCookie(response, newGuestToken);
  return response;
}
