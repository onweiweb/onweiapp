import { randomBytes } from "node:crypto";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@onwei/auth";
import {
  getRazorpayConfig,
  type CartOwner,
  type RazorpayConfig,
} from "@onwei/core";
import type { NextResponse } from "next/server";

/** Guest cart cookie: a random id, nothing personal. */
export const GUEST_CART_COOKIE = "onwei_cart";

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** The signed-in customer's id, or null. */
export async function customerIdFrom(request: Request): Promise<string | null> {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  const secret = process.env.SESSION_JWT_SECRET;
  if (!token || !secret) return null;
  const session = await verifySessionToken(token, secret);
  return session?.customerId ?? null;
}

const GUEST_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/**
 * Whose cart this request is about. Signed in: the customer's. Otherwise the
 * guest cookie's, created when `createGuest` is set (the first add to cart).
 */
export async function cartOwnerFrom(
  request: Request,
  options: { createGuest?: boolean } = {},
): Promise<{ owner: CartOwner; newGuestToken: string | null }> {
  const customerId = await customerIdFrom(request);
  if (customerId) return { owner: { customerId }, newGuestToken: null };
  const existing = readCookie(request, GUEST_CART_COOKIE);
  if (existing && GUEST_TOKEN.test(existing)) {
    return { owner: { guestToken: existing }, newGuestToken: null };
  }
  if (!options.createGuest) return { owner: {}, newGuestToken: null };
  const token = randomBytes(24).toString("base64url");
  return { owner: { guestToken: token }, newGuestToken: token };
}

export function setGuestCookie(response: NextResponse, token: string): void {
  response.cookies.set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export function clearGuestCookie(response: NextResponse): void {
  response.cookies.set(GUEST_CART_COOKIE, "", { path: "/", maxAge: 0 });
}

export function razorpayConfig(): RazorpayConfig | null {
  return getRazorpayConfig(process.env);
}
