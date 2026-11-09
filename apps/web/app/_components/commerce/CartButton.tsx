"use client";

import type { ReactNode } from "react";
import { useCart } from "./CartProvider";

// The bag icon in the header: opens the cart drawer and shows how many
// items are in it.
export function CartButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { cart, setOpen } = useCart();
  const count = cart?.itemCount ?? 0;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={count ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}
      className={className}
    >
      {children}
      {count > 0 ? (
        <span
          aria-hidden
          className="absolute -right-2.5 -top-2.5 flex min-w-4 items-center justify-center rounded-full bg-onwei-blue px-1 font-grotesk text-[0.625rem] leading-4 text-onwei-beige"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
