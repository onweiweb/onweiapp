"use client";

import type { CartLineView, ProductListItem } from "@onwei/core";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ProductImage } from "@/_components/ProductImage";
import { codeMessage, rupees } from "../../../lib/messages/commerce";
import { useCart } from "./CartProvider";

// Figma "Cart Drawer" (TgMpkXMC2QpghHlH6N63oV, 1217:3338 with items,
// 1217:3486 empty). Desktop 580px from the right; full width on phones (no
// mobile frame, approved to adapt in the same style). The free-delivery bar
// keeps the Figma look with one milestone (owner: the other milestones are
// not real offers). Totals sit above the button so no fee is a surprise.

function FreeShippingBar({
  remaining,
  threshold,
}: {
  remaining: number;
  threshold: number;
}) {
  const progress =
    threshold > 0 ? Math.min(1, (threshold - remaining) / threshold) : 1;
  const unlocked = remaining === 0;
  return (
    <div className="flex flex-col gap-3 bg-onwei-purple px-6 py-5 text-onwei-beige desk:px-8">
      <p className="text-center font-display text-[length:max(1rem,13px)] font-semibold uppercase">
        {unlocked
          ? "Congrats! You have unlocked free shipping"
          : `Add ${rupees(remaining)} more for free shipping`}
      </p>
      <div
        className="relative h-1.5 w-full rounded-full bg-onwei-beige/50"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-onwei-green transition-[width] duration-500"
          style={{ width: `${progress * 100}%` }}
        />
        <span
          className={`absolute right-0 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full ${unlocked ? "bg-onwei-green text-onwei-blue" : "bg-onwei-beige"}`}
        >
          {unlocked ? (
            <svg viewBox="0 0 16 16" className="size-3 fill-current">
              <path d="M6.2 11.6 2.6 8l1.1-1.1 2.5 2.5 6.1-6.1 1.1 1.1z" />
            </svg>
          ) : null}
        </span>
      </div>
      <p className="text-right font-grotesk text-[length:max(0.75rem,11px)]">
        {rupees(threshold)}
        <br />
        Free shipping
      </p>
    </div>
  );
}

function Line({ line }: { line: CartLineView }) {
  const { setQuantity, busy } = useCart();
  const max = Math.min(10, line.stock);
  return (
    <li className="flex gap-4 rounded-[1.25rem] bg-onwei-beige p-3">
      <Link
        href={`/product/${line.productSlug}`}
        className="relative size-[6.125rem] shrink-0 overflow-hidden rounded-[1rem] bg-onwei-green"
      >
        <ProductImage
          src={line.imageUrl ?? undefined}
          alt={line.productName}
          fill
          sizes="98px"
          className="object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display text-[length:max(1rem,13px)] font-semibold uppercase leading-tight text-onwei-blue">
              {line.productName}
            </p>
            {line.variantLabel ? (
              <p className="font-grotesk text-[length:max(0.75rem,11px)] text-onwei-blue/80">
                {line.variantLabel}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-right font-display text-[length:max(0.875rem,12px)] font-semibold text-onwei-blue">
            {line.compareAtPrice && line.compareAtPrice > line.unitPrice ? (
              <span className="mr-1 font-medium text-onwei-blue/60 line-through">
                {rupees(line.compareAtPrice)}
              </span>
            ) : null}
            {rupees(line.unitPrice)}
          </p>
        </div>
        {line.issue ? (
          <p
            role="alert"
            className="font-grotesk text-[length:max(0.75rem,11px)] text-[#b91c1c]"
          >
            {line.issue === "OUT_OF_STOCK"
              ? "Sold out. Remove it to check out."
              : "No longer available. Remove it to check out."}
          </p>
        ) : line.adjusted ? (
          <p className="font-grotesk text-[length:max(0.75rem,11px)] text-onwei-blue">
            Only {line.stock} left, so we&apos;ve updated your quantity.
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          {line.issue ? (
            <span />
          ) : (
            <div className="flex h-9 items-center rounded-full border border-onwei-blue text-onwei-blue">
              <button
                type="button"
                aria-label={`One less ${line.productName}`}
                disabled={busy}
                onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                className="flex h-full w-9 items-center justify-center text-lg"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="min-w-6 text-center font-grotesk text-[length:max(0.875rem,12px)]"
              >
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label={`One more ${line.productName}`}
                disabled={busy || line.quantity >= max}
                onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                className="flex h-full w-9 items-center justify-center text-lg disabled:opacity-40"
              >
                +
              </button>
            </div>
          )}
          <button
            type="button"
            aria-label={`Remove ${line.productName}`}
            disabled={busy}
            onClick={() => setQuantity(line.variantId, 0)}
            className="flex size-9 items-center justify-center text-onwei-blue/70 hover:text-onwei-blue"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden
            >
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </li>
  );
}

function Recommendations({ excludeIds }: { excludeIds: string[] }) {
  const { quickAdd, busy } = useCart();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const key = excludeIds.join(",");
  useEffect(() => {
    let alive = true;
    fetch(`/api/cart/recommended?exclude=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { products?: ProductListItem[] } | null) => {
        if (alive && data?.products) setProducts(data.products);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  if (products.length === 0) return null;
  return (
    <section className="flex flex-col gap-4 border-t border-onwei-blue pt-6">
      <h3 className="font-display text-[length:max(1.75rem,22px)] font-bold uppercase leading-none text-onwei-blue">
        You&apos;ll also love
      </h3>
      <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 desk:-mx-8 desk:px-8">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex w-[11rem] shrink-0 flex-col gap-2"
          >
            <Link
              href={`/product/${product.slug}`}
              className="relative h-[11rem] w-full overflow-hidden rounded-[1.25rem] bg-onwei-green"
            >
              <ProductImage
                src={product.image?.url}
                alt={product.image?.altText ?? product.name}
                fill
                sizes="176px"
                loading="eager"
                className="object-contain p-3"
              />
            </Link>
            <div className="flex items-start justify-between gap-2 font-display text-[length:max(0.875rem,12px)] font-semibold uppercase text-onwei-blue">
              <span className="min-w-0">{product.name}</span>
              <span className="shrink-0 font-grotesk text-[length:max(0.75rem,11px)] normal-case">
                {rupees(product.priceRangeMinorUnits.min)}
              </span>
            </div>
            {product.highlightTags.length ? (
              <p className="font-display text-[length:max(0.6875rem,10px)] text-onwei-blue">
                {product.highlightTags.slice(0, 2).join(" · ")}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => quickAdd(product.id, product.slug)}
              className="mt-auto rounded-full bg-onwei-blue py-2 font-grotesk text-[length:max(0.75rem,11px)] uppercase text-onwei-beige disabled:opacity-60"
            >
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CodeBox() {
  const { cart, applyCode, removeCode, setInsider, busy, session } = useCart();
  const [openBox, setOpenBox] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const inputId = useId();
  if (!cart) return null;

  const visibleCodes = cart.codes.filter((code) => !code.isInsiderCode);
  return (
    <div className="flex flex-col gap-2">
      {cart.insider ? (
        <div className="flex items-center justify-between gap-3 rounded-[0.75rem] bg-onwei-green px-3 py-2 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue">
          <span>
            {cart.insider.applied
              ? `Insider ${cart.insider.percent}% off is on.`
              : cart.insider.switchedOn && cart.insider.blockedBy
                ? `Your Insider ${cart.insider.percent}% can't be used with ${cart.insider.blockedBy}. We kept the bigger saving.`
                : `You're an Onwei Insider. Get ${cart.insider.percent}% off.`}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setInsider(!cart.insider!.switchedOn)}
            className="shrink-0 underline underline-offset-2"
          >
            {cart.insider.switchedOn ? "Remove" : "Apply"}
          </button>
        </div>
      ) : null}

      {visibleCodes.map((code) => (
        <div
          key={code.code}
          className="flex items-start justify-between gap-3 font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue"
        >
          <span>
            <span className="font-bold">{code.code}</span>{" "}
            {code.applied ? (
              "applied"
            ) : (
              <span className="text-[#b91c1c]">{codeMessage(code)}</span>
            )}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => removeCode(code.code)}
            className="shrink-0 underline underline-offset-2"
          >
            Remove
          </button>
        </div>
      ))}

      {openBox ? (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!value.trim()) return;
            const result = await applyCode(value.trim());
            setMessage(result.ok ? null : (result.message ?? null));
            if (result.ok) {
              setValue("");
              setOpenBox(false);
            }
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Discount or Insider code
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={value}
              onChange={(event) => {
                setValue(event.target.value.toUpperCase());
                setMessage(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Enter code"
              className="h-10 min-w-0 flex-1 rounded-full border border-onwei-blue bg-onwei-white px-4 font-grotesk text-[length:max(0.875rem,16px)] uppercase text-onwei-blue placeholder:normal-case placeholder:text-onwei-blue/50"
            />
            <button
              type="submit"
              disabled={busy || !value.trim()}
              className="h-10 rounded-full bg-onwei-blue px-5 font-grotesk text-[length:max(0.75rem,11px)] uppercase text-onwei-beige disabled:opacity-60"
            >
              Apply
            </button>
          </div>
          {message ? (
            <p
              role="alert"
              className="font-grotesk text-[length:max(0.75rem,11px)] text-[#b91c1c]"
            >
              {message}
            </p>
          ) : null}
          {!session?.signedIn ? (
            <p className="font-grotesk text-[length:max(0.6875rem,10px)] text-onwei-blue/70">
              Insider? Sign in at checkout and your discount applies by itself.
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpenBox(true)}
          className="w-fit font-display text-[length:max(0.875rem,12px)] font-semibold uppercase text-onwei-blue underline underline-offset-4"
        >
          Add discount code
        </button>
      )}
    </div>
  );
}

function Totals() {
  const { cart } = useCart();
  if (!cart) return null;
  const p = cart.pricing;
  const row =
    "flex justify-between font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue";
  return (
    <dl className="flex flex-col gap-1">
      <div className={row}>
        <dt>Subtotal</dt>
        <dd>{rupees(p.subtotal)}</dd>
      </div>
      {p.discounts
        .filter((d) => d.amount > 0)
        .map((d) => (
          <div key={d.label} className={row}>
            <dt>{d.label}</dt>
            <dd>−{rupees(d.amount)}</dd>
          </div>
        ))}
      <div className={row}>
        <dt>Delivery</dt>
        <dd>{p.shippingFee === 0 ? "Free" : rupees(p.shippingFee)}</dd>
      </div>
      <p className="font-grotesk text-[length:max(0.6875rem,10px)] text-onwei-blue/70">
        Inclusive of all taxes
      </p>
    </dl>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <p className="absolute -top-10 right-0 font-script text-[length:max(1.25rem,16px)] uppercase text-onwei-blue">
          Serve. Rally. Repeat.
        </p>
        <h2 className="font-display text-[length:max(2.5rem,30px)] font-bold uppercase leading-[0.95] text-onwei-blue">
          Made for
          <br />
          everyday{" "}
          <span className="underline decoration-2 underline-offset-8">
            play
          </span>
        </h2>
      </div>
      <Link
        href="/collection/pickleball"
        onClick={onClose}
        className="rounded-full bg-onwei-blue px-6 py-3 font-grotesk text-[length:max(0.8125rem,11px)] uppercase text-onwei-beige"
      >
        Shop pickleball
      </Link>
    </div>
  );
}

export function CartDrawer() {
  const { cart, open, setOpen, notice, clearNotice, freeShippingThreshold } =
    useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, setOpen]);

  if (!open) return null;
  const empty = !cart || cart.lines.length === 0;
  const close = () => {
    setOpen(false);
    clearNotice();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close bag"
        onClick={close}
        className="absolute inset-0 bg-onwei-blue/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-full flex-col outline-none desk:w-[36.25rem] ${empty ? "bg-onwei-green" : "bg-onwei-white"}`}
      >
        <div className="flex items-center justify-between px-6 py-5 desk:px-8">
          <h2
            id={titleId}
            className="font-display text-[length:max(2rem,26px)] font-bold uppercase leading-none text-onwei-blue"
          >
            Cart
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close bag"
            className="flex size-10 items-center justify-center text-onwei-blue"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {notice ? (
          <p
            role="status"
            className={`mx-6 mb-3 rounded-[0.75rem] px-4 py-2 font-grotesk text-[length:max(0.8125rem,11px)] desk:mx-8 ${notice.tone === "error" ? "bg-onwei-blue text-onwei-beige" : "bg-onwei-beige text-onwei-blue"}`}
          >
            {notice.text}
          </p>
        ) : null}

        {empty ? (
          <EmptyCart onClose={close} />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <FreeShippingBar
                remaining={cart.pricing.freeShippingRemaining}
                threshold={cart.freeShippingThreshold}
              />
              <div className="flex flex-col gap-6 px-6 py-6 desk:px-8">
                <ul className="flex flex-col gap-3">
                  {cart.lines.map((line) => (
                    <Line key={line.variantId} line={line} />
                  ))}
                </ul>
                <Recommendations
                  excludeIds={cart.lines.map((l) => l.productId)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-onwei-blue bg-onwei-beige px-6 py-5 desk:px-8">
              <CodeBox />
              <Totals />
              {cart.canCheckout ? (
                <Link
                  href="/checkout"
                  onClick={close}
                  className="flex h-12 items-center justify-center rounded-full bg-onwei-blue px-6 font-grotesk text-[length:max(0.875rem,12px)] uppercase tracking-[0.04em] text-onwei-beige"
                >
                  Continue to checkout - {rupees(cart.pricing.total)}
                </Link>
              ) : (
                <p
                  role="alert"
                  className="rounded-full bg-onwei-blue/10 px-4 py-3 text-center font-grotesk text-[length:max(0.8125rem,11px)] text-onwei-blue"
                >
                  Remove the items marked above to check out.
                </p>
              )}
              <p className="text-center font-grotesk text-[length:max(0.75rem,11px)] uppercase text-onwei-blue">
                Free shipping on orders over{" "}
                {rupees(freeShippingThreshold ?? cart.freeShippingThreshold)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
