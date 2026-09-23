"use client";

import { useProductVariant } from "./ProductVariantContext";

function chipClassName(active: boolean) {
  return `flex h-[30px] items-center justify-center rounded-[30px] border border-onwei-blue px-6 font-display text-[14px] font-semibold uppercase text-onwei-blue ${
    active ? "bg-onwei-green" : "bg-transparent"
  }`;
}

export function ProductVariantPicker() {
  const {
    colors,
    sizes,
    selectedColor,
    selectedSize,
    setSelectedColor,
    setSelectedSize,
    selectedVariant,
  } = useProductVariant();

  return (
    <div className="flex w-full flex-col items-start gap-3">
      {colors.length > 0 ? (
        <div className="flex w-full flex-col items-start gap-1.5">
          <p className="font-display text-[14px] font-medium capitalize text-onwei-blue">
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
          <p className="font-display text-[14px] font-medium capitalize text-onwei-blue">
            Size:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={chipClassName(size === selectedSize)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-col items-center gap-3 pt-3">
        {/* Always disabled: cart/checkout is Phase 2 and doesn't exist yet
            (see CLAUDE.md "Current phase"). Rendered present-and-disabled
            per the Phase 1 plan rather than omitted, since Figma specs it. */}
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center rounded-[30px] bg-onwei-blue px-6 py-3 font-grotesk text-label uppercase text-onwei-beige disabled:opacity-70"
        >
          add to cart
        </button>
        <p className="font-display text-[12px] text-onwei-blue">
          {selectedVariant.inStock
            ? "Free shipping on orders over ₹1500"
            : "Out of stock in this size/color"}
        </p>
      </div>
    </div>
  );
}
