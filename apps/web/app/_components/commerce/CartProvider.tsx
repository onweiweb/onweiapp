"use client";

import type { CartView } from "@onwei/core";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CART_ERRORS, codeMessage } from "../../../lib/messages/commerce";

export interface SessionInfo {
  signedIn: boolean;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  insider?: { code: string; percent: number } | null;
}

interface CartState {
  cart: CartView | null;
  /** Free delivery threshold, known even before anything is in the bag. */
  freeShippingThreshold: number | null;
  session: SessionInfo | null;
  open: boolean;
  busy: boolean;
  notice: { tone: "error" | "info"; text: string } | null;
  setOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  refreshSession: () => Promise<SessionInfo | null>;
  add: (variantId: string, quantity?: number) => Promise<boolean>;
  quickAdd: (productId: string, slug: string) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  applyCode: (code: string) => Promise<{ ok: boolean; message?: string }>;
  removeCode: (code: string) => Promise<void>;
  setInsider: (on: boolean) => Promise<void>;
  clearNotice: () => void;
}

const CartContext = createContext<CartState | null>(null);

// Pages that never show the bag (waitlist mode pages, private links).
const QUIET_PREFIXES = ["/ontheway", "/insider"];

async function call<T>(
  url: string,
  init?: RequestInit,
): Promise<(T & { ok: boolean; reason?: string }) | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      return null;
    return (await response.json()) as T & { ok: boolean; reason?: string };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [freeShippingThreshold, setThreshold] = useState<number | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<CartState["notice"]>(null);
  const quiet = QUIET_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const take = useCallback(
    (
      next:
        CartView | { empty: true; freeShippingThreshold?: number } | undefined,
    ) => {
      if (!next) return;
      if ("empty" in next) {
        setCart(null);
        if (next.freeShippingThreshold)
          setThreshold(next.freeShippingThreshold);
        return;
      }
      setCart(next);
      setThreshold(next.freeShippingThreshold);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const data = await call<{ cart: CartView }>("/api/cart");
    if (data?.ok) take(data.cart);
  }, [take]);

  const refreshSession = useCallback(async () => {
    const data = await call<SessionInfo>("/api/auth/session");
    const next = data?.ok ? { ...data } : null;
    setSession(next);
    return next;
  }, []);

  useEffect(() => {
    if (quiet) return;
    let alive = true;
    call<{ cart: CartView }>("/api/cart").then((data) => {
      if (alive && data?.ok) take(data.cart);
    });
    call<SessionInfo>("/api/auth/session").then((data) => {
      if (alive) setSession(data?.ok ? { ...data } : null);
    });
    return () => {
      alive = false;
    };
  }, [quiet, take]);

  const add = useCallback(
    async (variantId: string, quantity = 1) => {
      setBusy(true);
      setNotice(null);
      const data = await call<{ cart: CartView; limited?: boolean }>(
        "/api/cart",
        {
          method: "POST",
          body: JSON.stringify({ variantId, quantity }),
        },
      );
      setBusy(false);
      if (!data?.ok) {
        setNotice({
          tone: "error",
          text: CART_ERRORS[data?.reason ?? "NETWORK"] ?? CART_ERRORS.NETWORK!,
        });
        setOpen(true);
        return false;
      }
      take(data.cart);
      if (data.limited)
        setNotice({
          tone: "info",
          text: "We've added as many as we have in stock.",
        });
      setOpen(true);
      return true;
    },
    [take],
  );

  const quickAdd = useCallback(
    async (productId: string, slug: string) => {
      setBusy(true);
      setNotice(null);
      const data = await call<{ cart?: CartView; slug?: string }>(
        "/api/cart/quick",
        {
          method: "POST",
          body: JSON.stringify({ productId }),
        },
      );
      setBusy(false);
      if (data?.reason === "NEEDS_CHOICE") {
        router.push(`/product/${data.slug ?? slug}`);
        return;
      }
      if (!data?.ok || !data.cart) {
        setNotice({
          tone: "error",
          text: CART_ERRORS[data?.reason ?? "NETWORK"] ?? CART_ERRORS.NETWORK!,
        });
        setOpen(true);
        return;
      }
      take(data.cart);
      setOpen(true);
    },
    [router, take],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      setBusy(true);
      setNotice(null);
      const data = await call<{ cart: CartView; limited?: boolean }>(
        "/api/cart",
        {
          method: "PATCH",
          body: JSON.stringify({ variantId, quantity }),
        },
      );
      setBusy(false);
      if (!data?.ok) {
        setNotice({
          tone: "error",
          text: CART_ERRORS[data?.reason ?? "NETWORK"] ?? CART_ERRORS.NETWORK!,
        });
        return;
      }
      take(data.cart);
      if (data.limited)
        setNotice({
          tone: "info",
          text: "That's all we have in stock right now.",
        });
    },
    [take],
  );

  const applyCode = useCallback(
    async (code: string) => {
      setBusy(true);
      const data = await call<{
        cart?: CartView;
        short?: number;
        blockedBy?: string;
      }>("/api/cart/code", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setBusy(false);
      if (data?.cart) take(data.cart);
      if (data?.ok) return { ok: true };
      return {
        ok: false,
        message: data
          ? codeMessage({
              problem: data.reason ?? null,
              short: data.short,
              blockedBy: data.blockedBy,
            })
          : CART_ERRORS.NETWORK,
      };
    },
    [take],
  );

  const removeCode = useCallback(
    async (code: string) => {
      setBusy(true);
      const data = await call<{ cart: CartView }>("/api/cart/code", {
        method: "DELETE",
        body: JSON.stringify({ code }),
      });
      setBusy(false);
      if (data?.ok) take(data.cart);
    },
    [take],
  );

  const setInsider = useCallback(
    async (on: boolean) => {
      setBusy(true);
      const data = await call<{ cart: CartView }>("/api/cart/insider", {
        method: "PATCH",
        body: JSON.stringify({ on }),
      });
      setBusy(false);
      if (data?.ok) take(data.cart);
    },
    [take],
  );

  const value = useMemo<CartState>(
    () => ({
      cart,
      freeShippingThreshold,
      session,
      open,
      busy,
      notice,
      setOpen,
      refresh,
      refreshSession,
      add,
      quickAdd,
      setQuantity,
      applyCode,
      removeCode,
      setInsider,
      clearNotice: () => setNotice(null),
    }),
    [
      cart,
      freeShippingThreshold,
      session,
      open,
      busy,
      notice,
      refresh,
      refreshSession,
      add,
      quickAdd,
      setQuantity,
      applyCode,
      removeCode,
      setInsider,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Outside the provider (isolated component tests, error pages) the bag is
// simply empty and does nothing, rather than crashing the page.
const INERT: CartState = {
  cart: null,
  freeShippingThreshold: null,
  session: null,
  open: false,
  busy: false,
  notice: null,
  setOpen: () => {},
  refresh: async () => {},
  refreshSession: async () => null,
  add: async () => false,
  quickAdd: async () => {},
  setQuantity: async () => {},
  applyCode: async () => ({ ok: false }),
  removeCode: async () => {},
  setInsider: async () => {},
  clearNotice: () => {},
};

export function useCart(): CartState {
  return useContext(CartContext) ?? INERT;
}
