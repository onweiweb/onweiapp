"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ProductVariantProvider } from "../ProductVariantContext";
import { ProductVariantPicker } from "../ProductVariantPicker";
import { VariantPrice } from "../VariantPrice";
import { rupees } from "../../../lib/messages/commerce";
import { useCart, type QuickChoice } from "./CartProvider";

// Product card "add to cart": adds straight away when there's one option,
// otherwise opens a small picker over the page (same pills as the product
// page) so the customer never has to leave to choose a size or colour.
export function QuickAddButton({
  productId,
  inStock,
  className,
}: {
  productId: string;
  inStock: boolean;
  className: string;
}) {
  const { quickAdd } = useCart();
  const [working, setWorking] = useState(false);
  const [choice, setChoice] = useState<QuickChoice | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={!inStock || working}
        onClick={async () => {
          setWorking(true);
          const next = await quickAdd(productId);
          setWorking(false);
          if (next) setChoice(next);
        }}
        className={`${className} disabled:opacity-60`}
      >
        {!inStock ? "sold out" : working ? "adding..." : "add to cart"}
      </button>
      {choice ? (
        <QuickPicker choice={choice} onClose={() => setChoice(null)} />
      ) : null}
    </>
  );
}

function QuickPicker({
  choice,
  onClose,
}: {
  choice: QuickChoice;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const formattedPrices = Object.fromEntries(
    choice.variants.map((variant) => [
      variant.id,
      rupees(variant.priceMinorUnits),
    ]),
  );
  // Start on an option that's actually in stock.
  const ordered = [
    ...choice.variants.filter((variant) => variant.inStock),
    ...choice.variants.filter((variant) => !variant.inStock),
  ];

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-onwei-blue/40 desk:items-center desk:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex w-full max-w-[30rem] flex-col gap-4 rounded-t-[1.75rem] bg-onwei-beige p-6 text-onwei-blue outline-none desk:rounded-[1.75rem] desk:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-onwei-blue"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <h2
          id={titleId}
          className="pr-12 font-display text-[length:max(1.5rem,20px)] font-bold uppercase leading-[1]"
        >
          {choice.name}
        </h2>
        <ProductVariantProvider
          variants={ordered}
          formattedPrices={formattedPrices}
        >
          <VariantPrice />
          <ProductVariantPicker slug={choice.slug} onAdded={onClose} />
        </ProductVariantProvider>
        <Link
          href={`/product/${choice.slug}`}
          onClick={onClose}
          className="self-center font-grotesk text-[length:max(0.75rem,11px)] underline underline-offset-4"
        >
          See full details
        </Link>
      </div>
    </div>
  );
}
