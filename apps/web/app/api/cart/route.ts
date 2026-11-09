import {
  addToCart,
  getCartView,
  getStoreSettings,
  parseJsonBody,
  setCartQuantity,
} from "@onwei/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidInput } from "../_lib/invalidInput";
import { cartOwnerFrom, setGuestCookie } from "../_lib/requestAuth";

// The cart drawer's data. Prices, discounts and fees are always worked out
// here on the server; the browser only ever sends ids and quantities.

export const dynamic = "force-dynamic";

const EMPTY = { lines: [], itemCount: 0 };

export async function GET(request: Request) {
  const { owner } = await cartOwnerFrom(request);
  if (!owner.customerId && !owner.guestToken) {
    const settings = await getStoreSettings();
    return NextResponse.json({
      ok: true,
      cart: {
        ...EMPTY,
        empty: true,
        freeShippingThreshold: settings.freeShippingThreshold,
      },
    });
  }
  const url = new URL(request.url);
  const method = url.searchParams.get("payment");
  const cart = await getCartView(owner, {
    paymentMethod: method === "COD" || method === "RAZORPAY" ? method : null,
  });
  return NextResponse.json({ ok: true, cart });
}

const addSchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, addSchema);
  if (!parsed.ok) return invalidInput();
  const { owner, newGuestToken } = await cartOwnerFrom(request, {
    createGuest: true,
  });
  const result = await addToCart(
    owner,
    parsed.data.variantId,
    parsed.data.quantity,
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }
  const cart = await getCartView(owner);
  const response = NextResponse.json({
    ok: true,
    limited: result.limited ?? false,
    cart,
  });
  if (newGuestToken) setGuestCookie(response, newGuestToken);
  return response;
}

const setSchema = z.object({
  variantId: z.string().min(1).max(64),
  quantity: z.number().int().min(0).max(10),
});

export async function PATCH(request: Request) {
  const parsed = await parseJsonBody(request, setSchema);
  if (!parsed.ok) return invalidInput();
  const { owner } = await cartOwnerFrom(request);
  if (!owner.customerId && !owner.guestToken) return invalidInput();
  const result = await setCartQuantity(
    owner,
    parsed.data.variantId,
    parsed.data.quantity,
  );
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: 400 },
    );
  }
  const cart = await getCartView(owner);
  return NextResponse.json({
    ok: true,
    limited: result.limited ?? false,
    cart,
  });
}
