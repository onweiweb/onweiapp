"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "../../lib/analytics/track";
import { useProductVariant } from "./ProductVariantContext";
import { useCart } from "./commerce/CartProvider";
import { rupees } from "../../lib/messages/commerce";

// Figma 759:3069 / 759:3078: 30px pills, 48px side padding, the picked one
// filled green and semibold, the rest medium weight. Size pills share the
// row equally (flex-1), colour pills keep their own width.
function chipClassName(active: boolean, fill = false) {
  return `flex h-[1.875rem] items-center justify-center rounded-[1.875rem] border border-onwei-blue px-12 font-display text-[length:max(0.875rem,11px)] uppercase text-onwei-blue ${
    active ? "bg-onwei-green font-semibold" : "bg-transparent font-medium"
  } ${fill ? "min-w-0 flex-1 px-2 desk:px-12" : ""}`;
}

export function ProductVariantPicker({
  slug,
  onAdded,
}: {
  /** Product slug for analytics when the picker isn't on the product page. */
  slug?: string;
  /** Called after a successful add (the card's quick picker closes itself). */
  onAdded?: () => void;
} = {}) {
  const {
    colors,
    sizes,
    selectedColor,
    selectedSize,
    setSelectedColor,
    setSelectedSize,
    selectedVariant,
  } = useProductVariant();
  const { add, busy, freeShippingThreshold } = useCart();

  // Report a pick, not the default shown on load.
  const pathname = usePathname();
  const productSlug = slug ?? pathname.split("/").pop() ?? "";
  const lastVariantId = useRef(selectedVariant.id);
  useEffect(() => {
    if (lastVariantId.current === selectedVariant.id) return;
    lastVariantId.current = selectedVariant.id;
    track("variant_selected", {
      product_slug: productSlug,
      variant_id: selectedVariant.id,
    });
  }, [selectedVariant.id, productSlug]);

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {colors.length > 0 ? (
        <div className="flex w-full flex-col items-start gap-1.5">
          <p className="font-display text-[length:max(0.875rem,11px)] font-medium capitalize text-onwei-blue">
            Color:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={chipClassName(color === selectedColor)}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizes.length > 0 ? (
        <div className="flex w-full flex-col items-start gap-1.5">
          <p className="font-display text-[length:max(0.875rem,11px)] font-medium capitalize text-onwei-blue">
            Size:
          </p>
          <div className="flex w-full items-center gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={chipClassName(size === selectedSize, true)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-col items-center gap-3 pt-3">
        <button
          type="button"
          disabled={!selectedVariant.inStock || busy}
          onClick={() => {
            track("add_to_cart", {
              product_slug: productSlug,
              variant_id: selectedVariant.id,
            });
            void add(selectedVariant.id, 1).then((ok) => {
              if (ok) onAdded?.();
            });
          }}
          className="flex w-full items-center justify-center rounded-[1.875rem] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase leading-none text-onwei-beige disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selectedVariant.inStock
            ? busy
              ? "adding..."
              : "add to cart"
            : "sold out"}
        </button>
        <p className="font-display text-[length:max(0.75rem,11px)] text-onwei-blue">
          {selectedVariant.inStock
            ? freeShippingThreshold
              ? `Free shipping on orders over ${rupees(freeShippingThreshold)}`
              : "Free shipping on bigger orders"
            : "Out of stock in this size/color"}
        </p>
      </div>
    </div>
  );
}
